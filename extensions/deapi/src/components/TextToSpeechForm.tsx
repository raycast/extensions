import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { getClient } from "../lib/files";
import { generateSpeech } from "../lib/jobs";
import { speechModels, speedRange, voicesFor } from "../lib/models";
import { findModel, NO_MODELS_MESSAGE, showNoModelsToast, useModels } from "../lib/useModels";
import { JobView } from "./JobView";

interface Values {
  text: string;
  model: string;
  voice: string;
  speed: string;
}

const SPEEDS = ["0.5", "0.75", "1", "1.25", "1.5", "2"];

export function TextToSpeechForm(props: { initialText?: string }) {
  const { push } = useNavigation();
  const { models, isLoading, noModels } = useModels(["txt2audio"], speechModels);

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: { text: props.initialText ?? "", speed: "1" },
    validation: {
      text: (value) => (!value?.trim() ? "Enter the text to read" : undefined),
    },
    onSubmit: (submitted) => {
      const model = findModel(models, submitted.model);
      if (!model) {
        showNoModelsToast();
        return;
      }
      const voices = voicesFor(model);
      const voice =
        voices.find((item) => item.id === submitted.voice)?.id ??
        voices.find((item) => item.id === model.info?.defaults?.voice)?.id ??
        voices[0]?.id;
      const range = speedRange(model);
      const speed = Math.min(Math.max(Number(submitted.speed) || 1, range.min), range.max);
      const text = submitted.text.trim();
      const limits = model.info?.limits;
      if (limits?.min_text && text.length < limits.min_text) {
        showFailureToast(`${model.name} needs at least ${limits.min_text} characters.`, { title: "Text too short" });
        return;
      }
      if (limits?.max_text && text.length > limits.max_text) {
        showFailureToast(`${model.name} reads up to ${limits.max_text} characters.`, { title: "Text too long" });
        return;
      }
      push(
        <JobView
          kind="speech"
          model={`${model.name}${voice ? ` · ${voice}` : ""}`}
          input={text}
          submit={() => generateSpeech(getClient(), { model, text, voice, speed })}
        />,
      );
    },
  });

  const model = findModel(models, values.model);
  const voices = model ? voicesFor(model) : [];
  const defaultVoice = voices.find((voice) => voice.id === model?.info?.defaults?.voice)?.id ?? voices[0]?.id ?? "";
  const range = model ? speedRange(model) : { min: 1, max: 1 };
  const speeds = SPEEDS.filter((speed) => Number(speed) >= range.min && Number(speed) <= range.max);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Speech" icon={Icon.SpeakerOn} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {noModels ? <Form.Description title="Unavailable" text={NO_MODELS_MESSAGE} /> : null}
      <Form.TextArea title="Text" placeholder="Type or paste the text to read aloud" {...itemProps.text} />
      <Form.Dropdown id="model" title="Model" value={model?.slug ?? ""} onChange={itemProps.model.onChange}>
        {models.map((item) => (
          <Form.Dropdown.Item key={item.slug} value={item.slug} title={item.name} />
        ))}
      </Form.Dropdown>
      {voices.length > 1 ? (
        <Form.Dropdown
          id="voice"
          title="Voice"
          value={voices.some((voice) => voice.id === values.voice) ? values.voice : defaultVoice}
          onChange={itemProps.voice.onChange}
        >
          {voices.map((voice) => (
            <Form.Dropdown.Item key={voice.id} value={voice.id} title={voice.title} />
          ))}
        </Form.Dropdown>
      ) : null}
      {speeds.length > 1 ? (
        <Form.Dropdown
          id="speed"
          title="Speed"
          value={speeds.includes(values.speed) ? values.speed : "1"}
          onChange={itemProps.speed.onChange}
        >
          {speeds.map((speed) => (
            <Form.Dropdown.Item key={speed} value={speed} title={`${speed}×`} />
          ))}
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
