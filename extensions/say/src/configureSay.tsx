import { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Voice, say } from "mac-say";
import { defaultVoice } from "./constants.js";
import { getSortedVoices, languageCodeToEmojiFlag } from "./utils.js";

export default function ConfigureSay() {
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useCachedState<string>("voice", defaultVoice);

  const loadData = async () => {
    const voices = await getSortedVoices();
    setVoices(voices);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say Example"
            onSubmit={async () => {
              const foundVoice = voices.find((v) => v.name === voice);
              await say("This is Raycast Say extension test.", { voice: foundVoice ? voice : undefined });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="voice"
        title="Voice"
        value={voice}
        onChange={(value) => {
          if (value !== voice) {
            setVoice(value);
            showToast({ title: "", message: "Changes saved" });
          }
        }}
      >
        <Form.Dropdown.Item value="System Default" title="System Default" />
        {voices.map((voice) => (
          <Form.Dropdown.Item
            key={`${voice.name}-${voice.languageCode}`}
            value={voice.name}
            title={voice.name}
            icon={languageCodeToEmojiFlag(voice.languageCode)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
