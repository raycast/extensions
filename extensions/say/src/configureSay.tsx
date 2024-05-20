import { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { groupBy } from "lodash";
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
      searchBarAccessory={
        <Form.LinkAccessory
          target="x-apple.systempreferences:com.apple.preference.universalaccess"
          text="Open System Preferences"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say Example"
            onSubmit={async () => {
              const foundVoice = voices.find((v) => v.name === voice);
              await say(foundVoice ? foundVoice.example : "This is system default voice.", {
                voice: foundVoice ? voice : undefined,
              });
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
        {voices.length > 0 && <Form.Dropdown.Item value={defaultVoice} title={defaultVoice} />}
        {Object.entries(
          groupBy(voices, (v) => new Intl.DisplayNames(["en"], { type: "language" }).of(v.languageCode.slice(0, 2))),
        ).map(([language, voices]) => (
          <Form.Dropdown.Section key={language} title={language}>
            {voices.map((v) => (
              <Form.Dropdown.Item
                key={`${v.name}-${v.languageCode}`}
                value={v.name}
                title={v.name}
                icon={languageCodeToEmojiFlag(v.languageCode)}
              />
            ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      <Form.Description
        title="Advanced"
        text="This configuration page does not alter you system settings. For more advanced configurations please go to System Settings -> Accessibility -> Spoken Content."
      />
    </Form>
  );
}
