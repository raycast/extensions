import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LocalStorage,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { defaultWhisperLanguage, formatSize } from "./core";
import {
  AudioInputDevice,
  audioInputDevices,
  defaultMicrophone,
  dictationStorage,
} from "./dictation";
import {
  DictationAppearance,
  dictationPositions,
  parseDictationAppearance,
  parseDictationOffset,
} from "./dictation-appearance";
import { openSetup } from "./open-setup";
import { preferences } from "./preferences";
import { LanguageDropdown, useFavoriteLanguages } from "./transcription";
import { WhisperModel, modelName, whisperModels } from "./whisper";

export { runQueueWorker } from "./jobs";

type State = {
  loaded: boolean;
  models: WhisperModel[];
  defaultModel?: string;
  devices: AudioInputDevice[];
  microphoneError?: string;
  model?: string;
  microphone?: string;
  language?: string;
  appearance?: DictationAppearance;
};

export default function Command() {
  const settings = preferences();
  const favorites = useFavoriteLanguages(settings);
  const [state, setState] = useState<State>({
    loaded: false,
    models: [],
    devices: [],
  });
  const [offsetXError, setOffsetXError] = useState<string>();
  const [offsetYError, setOffsetYError] = useState<string>();

  useEffect(() => {
    let active = true;
    Promise.all([
      whisperModels(settings),
      audioInputDevices(settings).then(
        (devices) => ({ devices }),
        (error) => ({
          devices: [],
          microphoneError:
            error instanceof Error ? error.message : String(error),
        }),
      ),
      LocalStorage.getItem<string>(dictationStorage.model),
      LocalStorage.getItem<string>(dictationStorage.microphone),
      LocalStorage.getItem<string>(dictationStorage.language),
      LocalStorage.getItem<string>(dictationStorage.visualizer),
    ]).then(([models, audio, model, microphone, language, visualizer]) => {
      if (!active) return;
      setState({
        loaded: true,
        ...models,
        ...audio,
        model,
        microphone,
        language,
        appearance: parseDictationAppearance(visualizer),
      });
    });
    return () => {
      active = false;
    };
  }, []);

  if (!state.loaded || !favorites.loaded) return <Form isLoading />;
  const defaultModel = state.models.some((model) => model.path === state.model)
    ? state.model
    : state.defaultModel;
  const savedMicrophone = state.devices.some(
    (device) => device.name === state.microphone,
  )
    ? state.microphone
    : defaultMicrophone;
  const missingMicrophone =
    state.microphone &&
    state.microphone !== defaultMicrophone &&
    !state.devices.some((device) => device.name === state.microphone)
      ? state.microphone
      : undefined;

  const setupAction = (
    <Action
      title="Manage Tools and Models"
      icon={Icon.Download}
      onAction={openSetup}
    />
  );

  return (
    <Form
      navigationTitle="Configure Dictation"
      actions={
        <ActionPanel>
          {state.models.length > 0 && (
            <Action.SubmitForm
              title="Save Dictation Settings"
              icon={Icon.CheckCircle}
              onSubmit={async (values: {
                model: string;
                microphone: string;
                language: string;
                position: DictationAppearance["position"];
                offsetX: string;
                offsetY: string;
              }) => {
                const offsetX = parseDictationOffset(values.offsetX);
                const offsetY = parseDictationOffset(values.offsetY);
                const offsetError = "Enter a number between -10000 and 10000.";
                setOffsetXError(
                  offsetX === undefined ? offsetError : undefined,
                );
                setOffsetYError(
                  offsetY === undefined ? offsetError : undefined,
                );
                if (offsetX === undefined || offsetY === undefined) return;
                const appearance = parseDictationAppearance(
                  JSON.stringify({
                    position: values.position,
                    offsetX,
                    offsetY,
                  }),
                );
                await Promise.all([
                  LocalStorage.setItem(dictationStorage.model, values.model),
                  LocalStorage.setItem(
                    dictationStorage.microphone,
                    values.microphone,
                  ),
                  LocalStorage.setItem(
                    dictationStorage.language,
                    values.language,
                  ),
                  LocalStorage.setItem(
                    dictationStorage.visualizer,
                    JSON.stringify(appearance),
                  ),
                ]);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Dictation settings saved",
                });
                popToRoot();
              }}
            />
          )}
          {setupAction}
        </ActionPanel>
      }
    >
      <Form.Description text="Assign Dictate a hotkey in Raycast Settings, hold it while speaking, then release it to insert the text. To use Caps Lock, enable Raycast's Hyper Key and assign a Hyper shortcut such as Hyper+D." />
      {state.models.length > 0 ? (
        <Form.Dropdown
          id="model"
          title="Dictation Model"
          defaultValue={defaultModel}
          info="This is separate from the model used for audio and video transcription. large-v3-turbo is recommended."
        >
          {state.models.map((model) => (
            <Form.Dropdown.Item
              key={model.path}
              value={model.path}
              title={`${modelName(model.path)} · ${formatSize(model.size)}`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description
          title="Dictation Model"
          text="No whisper model is installed. Open Manage Tools and Models and download one, such as large-v3-turbo."
        />
      )}
      <Form.Dropdown
        id="microphone"
        title="Microphone"
        defaultValue={savedMicrophone}
        error={state.microphoneError}
        info="System Default follows the input selected in macOS. Connected microphones are detected with ffmpeg."
      >
        <Form.Dropdown.Item
          value={defaultMicrophone}
          title="System Default"
          icon={Icon.Microphone}
        />
        {state.devices.map((device) => (
          <Form.Dropdown.Item
            key={`${device.index}:${device.name}`}
            value={device.name}
            title={device.name}
          />
        ))}
      </Form.Dropdown>
      {missingMicrophone && (
        <Form.Description
          text={`${missingMicrophone} is not connected. System Default will be used after you save.`}
        />
      )}
      <LanguageDropdown
        title="Dictation Language"
        favoriteLanguages={favorites.value}
        defaultLanguage={
          state.language ??
          defaultWhisperLanguage(favorites.value, settings.whisperLanguage)
        }
        detectAutomatically
      />
      <Form.Separator />
      <Form.Dropdown
        id="position"
        title="Bubble Position"
        defaultValue={state.appearance?.position}
      >
        {dictationPositions.map((position) => (
          <Form.Dropdown.Item
            key={position.value}
            value={position.value}
            title={position.title}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="offsetX"
        title="Horizontal Offset"
        defaultValue={String(state.appearance?.offsetX ?? 0)}
        error={offsetXError}
        onChange={() => setOffsetXError(undefined)}
        info="Move the bubble in screen points from the selected position. Positive values move right; negative values move left."
      />
      <Form.TextField
        id="offsetY"
        title="Vertical Offset"
        defaultValue={String(state.appearance?.offsetY ?? 0)}
        error={offsetYError}
        onChange={() => setOffsetYError(undefined)}
        info="Move the bubble in screen points from the selected position. Positive values move down; negative values move up."
      />
      <Form.Description text="Dictation stays on this Mac. Silero voice activity detection removes silence, and the completed utterance is processed only after you release the hotkey." />
    </Form>
  );
}
