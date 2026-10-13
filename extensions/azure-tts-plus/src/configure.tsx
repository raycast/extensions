import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { speak } from "./lib/host.js";
import { getAzureCredentials } from "./lib/prefs.js";
import {
  Settings,
  clampRate,
  loadSettings,
  maxRate,
  minRate,
  rateStep,
  saveSettings,
} from "./lib/settings.js";
import { Engine, sendControl } from "./lib/state.js";
import {
  VoiceOption,
  listAzureVoices,
  listWindowsVoices,
} from "./lib/voices.js";

const rateOptions = () => {
  const options: number[] = [];
  for (let rate = minRate; rate <= maxRate + 0.001; rate += rateStep)
    options.push(clampRate(rate));
  return options;
};

const sample =
  "This is how the reader will sound. Voce pode trocar a voz e a velocidade aqui.";

const groupVoices = (voices: VoiceOption[]) => {
  const sections = new Map<string, VoiceOption[]>();
  for (const voice of voices) {
    const bucket = sections.get(voice.group);
    if (bucket) bucket.push(voice);
    else sections.set(voice.group, [voice]);
  }
  return [...sections.entries()];
};

export default function Configure() {
  const stored = useMemo(loadSettings, []);
  const credentials = useMemo(getAzureCredentials, []);
  const [engine, setEngine] = useState<Engine>(
    credentials ? stored.engine : "windows",
  );
  const [azureVoice, setAzureVoice] = useState(stored.azureVoice);
  const [windowsVoice, setWindowsVoice] = useState(stored.windowsVoice);
  const [rate, setRate] = useState(String(stored.rate));
  const [overlay, setOverlay] = useState(stored.overlay);

  const { data: azureVoices, isLoading: loadingAzure } = usePromise(
    async () => (credentials ? listAzureVoices(credentials) : []),
    [],
    {
      // Block body on purpose: `usePromise` types onError as returning void, and
      // showFailureToast resolves to a Toast.
      onError: (error) => {
        void showFailureToast(error, {
          title: "Could not load the Azure voices",
        });
      },
    },
  );
  const { data: windowsVoices, isLoading: loadingWindows } = usePromise(
    listWindowsVoices,
    [],
    {
      onError: (error) => {
        void showFailureToast(error, {
          title: "Could not load the Windows voices",
        });
      },
    },
  );

  const current = (): Settings => ({
    engine,
    azureVoice,
    windowsVoice,
    rate: clampRate(Number(rate) || 1),
    overlay,
  });

  const persist = async () => {
    saveSettings(current());
    await showToast({ style: Toast.Style.Success, title: "Saved" });
  };

  const test = async () => {
    saveSettings(current());
    try {
      await speak(sample);
    } catch (error) {
      await showFailureToast(error, { title: "Could not speak" });
    }
  };

  return (
    <Form
      isLoading={loadingAzure || loadingWindows}
      actions={
        <ActionPanel>
          <Action title="Save" icon={Icon.Check} onAction={persist} />
          <Action
            title="Save and Hear a Sample"
            icon={Icon.Play}
            onAction={test}
          />
          <Action
            title="Stop Speaking"
            icon={Icon.Stop}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => sendControl("stop")}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="engine"
        title="Engine"
        value={engine}
        onChange={(value) => setEngine(value as Engine)}
        info="Azure gives the neural voices and needs a key in the extension preferences. Windows works offline and costs nothing."
      >
        <Form.Dropdown.Item
          value="azure"
          title={credentials ? "Azure Neural" : "Azure Neural (no key yet)"}
        />
        <Form.Dropdown.Item value="windows" title="Windows (offline)" />
      </Form.Dropdown>

      {engine === "azure" ? (
        <Form.Dropdown
          id="azureVoice"
          title="Azure Voice"
          value={azureVoice}
          onChange={setAzureVoice}
        >
          {groupVoices(azureVoices ?? []).map(([group, items]) => (
            <Form.Dropdown.Section key={group} title={group}>
              {items.map((voice) => (
                <Form.Dropdown.Item
                  key={voice.id}
                  value={voice.id}
                  title={voice.title}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Dropdown
          id="windowsVoice"
          title="Windows Voice"
          value={windowsVoice}
          onChange={setWindowsVoice}
        >
          <Form.Dropdown.Item value="" title="System default" />
          {groupVoices(windowsVoices ?? []).map(([group, items]) => (
            <Form.Dropdown.Section key={group} title={group}>
              {items.map((voice) => (
                <Form.Dropdown.Item
                  key={voice.id}
                  value={voice.id}
                  title={voice.title}
                />
              ))}
            </Form.Dropdown.Section>
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        id="rate"
        title="Speed"
        value={rate}
        onChange={setRate}
        info="The speed a reading starts at. While it is being read, the speed chips on the reader panel change it live."
      >
        {rateOptions().map((option) => (
          <Form.Dropdown.Item
            key={option}
            value={String(option)}
            title={`${option.toFixed(1)}x${option === 1 ? "  (natural)" : ""}`}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="overlay"
        label="Show the reader overlay"
        value={overlay}
        onChange={setOverlay}
        info="A floating panel that highlights each word as it is spoken, carries the speed chips, and lets you click a word to read again from it."
      />

      <Form.Description
        title="While it is reading"
        text={
          "Bind a global hotkey to Speak Selected Text in Raycast — the same key stops it.\n" +
          "Click any word on the reader panel to read again from it. Pick a speed from the chips at the bottom of the panel; − and + move it by 0.1x.\n" +
          "A long text opens the panel bigger and in the middle of the screen, so there is enough of the passage on show to click into."
        }
      />
    </Form>
  );
}
