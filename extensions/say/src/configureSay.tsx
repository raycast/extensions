import { useEffect, useState } from "react";
import { ActionPanel, Form, Action, showToast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { groupBy } from "lodash";
import { Device, Voice, say, getAudioDevices } from "mac-say";
import { systemDefault } from "./constants.js";
import { getRates, getSortedVoices, getSpeechPlist, languageCodeToEmojiFlag, voiceNameToEmojiFlag } from "./utils.js";
import { SpeechPlist } from "./types.js";

export default function ConfigureSay() {
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);
  const [speechPlist, setSpeechPlist] = useState<SpeechPlist>();

  const [voice, setVoice] = useCachedState<string>("voice", systemDefault);
  const [rate, setRate] = useCachedState<string>("rate", systemDefault);
  const [device, setDevice] = useCachedState<string>("audioDevice", systemDefault);

  const loadData = async () => {
    const [audioDevices, voices, plist] = await Promise.all([
      getAudioDevices().catch(() => []),
      getSortedVoices().catch(() => []),
      getSpeechPlist().catch(() => undefined),
    ]);
    setSpeechPlist(plist);
    setVoices(voices);
    setAudioDevices(audioDevices);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) return <Form isLoading />;

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="x-apple.systempreferences:com.apple.preference.universalaccess"
          text="Open System Settings"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Say Example"
            onSubmit={async () => {
              const foundVoice = voices.find((v) => v.name === (voice === systemDefault ? speechPlist?.voice : voice));
              await say(foundVoice ? foundVoice.example : "This voice is from system settings.", {
                voice: foundVoice ? (voice === systemDefault ? undefined : voice) : undefined,
                rate: rate === systemDefault ? undefined : parseInt(rate, 10),
                audioDevice: device === systemDefault ? undefined : device,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="voice"
        title="Speaking Voice"
        value={voice}
        onChange={(value) => {
          if (value !== voice) {
            setVoice(value);
            showToast({ title: "", message: "Changes saved" });
          }
        }}
      >
        <Form.Dropdown.Item
          icon={voiceNameToEmojiFlag(voices, speechPlist?.voice)}
          value={systemDefault}
          title={`${speechPlist?.voice ?? "Default"} (${systemDefault})`}
        />
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
      <Form.Dropdown
        id="rate"
        title="Speaking Rate"
        value={rate}
        onChange={(value) => {
          if (value !== rate) {
            setRate(value);
            showToast({ title: "", message: "Changes saved" });
          }
        }}
      >
        <Form.Dropdown.Item value={systemDefault} title={`${speechPlist?.rate ?? "Default"} (${systemDefault})`} />
        <Form.Dropdown.Section>
          {getRates().map((rate) => (
            <Form.Dropdown.Item key={rate} value={rate.toString()} title={rate.toString()} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown
        id="outputDevice"
        value={device}
        title="Output Device"
        onChange={(value) => {
          if (value !== device) {
            setDevice(value);
            showToast({ title: "", message: "Changes saved" });
          }
        }}
      >
        <Form.Dropdown.Item value={systemDefault} title={`Default (${systemDefault})`} />
        <Form.Dropdown.Section>
          {audioDevices.map((d) => (
            <Form.Dropdown.Item key={d.id} value={d.id} title={d.name} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Description
        title="Advanced"
        text="This configuration page does not alter you system settings. For more advanced configurations please go to System Settings -> Accessibility -> Spoken Content."
      />
    </Form>
  );
}
