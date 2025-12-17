import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast } from "@raycast/api";
import { groupBy } from "lodash";
import { Device, Voice, getAudioDevices, say } from "mac-say";
import { SpeechPlist } from "@/types";
import { useSaySettings } from "@/hooks/use-say-settings";
import {
  getAdvancedMessage,
  getRates,
  getSortedVoices,
  getSpeechPlist,
  languageCodeToEmojiFlag,
  voiceNameToEmojiFlag,
  SYSTEM_DEFAULT,
} from "@/utils";

export default function ConfigureSay() {
  const [isLoading, setIsLoading] = useState(true);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [audioDevices, setAudioDevices] = useState<Device[]>([]);
  const [speechPlist, setSpeechPlist] = useState<SpeechPlist>();
  const { voice, rate, device, keepSilentOnError, setVoice, setRate, setAudioDevice, setKeepSilentOnError } =
    useSaySettings();

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
            icon={Icon.SpeechBubbleActive}
            title="Say Example"
            onSubmit={async () => {
              const foundVoice = voices.find((v) => v.name === (voice === SYSTEM_DEFAULT ? speechPlist?.voice : voice));
              await say(foundVoice ? foundVoice.example : "This voice is from system settings.", {
                voice: foundVoice ? (voice === SYSTEM_DEFAULT ? undefined : voice) : undefined,
                rate: rate === SYSTEM_DEFAULT ? undefined : parseInt(rate, 10),
                audioDevice: device === SYSTEM_DEFAULT ? undefined : device,
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
          value={SYSTEM_DEFAULT}
          title={`${speechPlist?.voice ?? "Default"} (${SYSTEM_DEFAULT})`}
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
        <Form.Dropdown.Item value={SYSTEM_DEFAULT} title={`${speechPlist?.rate ?? "Default"} (${SYSTEM_DEFAULT})`} />
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
            setAudioDevice(value);
            showToast({ title: "", message: "Changes saved" });
          }
        }}
      >
        <Form.Dropdown.Item value={SYSTEM_DEFAULT} title={`Default (${SYSTEM_DEFAULT})`} />
        <Form.Dropdown.Section>
          {audioDevices.map((d) => (
            <Form.Dropdown.Item key={d.id} value={d.id} title={d.name} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Checkbox
        id="keepSilentOnError"
        title="Keep Silent On Error"
        label="Enable"
        value={keepSilentOnError}
        onChange={setKeepSilentOnError}
      />
      <Form.Description title="Advanced" text={getAdvancedMessage()} />
      <Form.Description
        title="Recommendation"
        text="Siri is the closest to a real human voice. You can pick Siri voices in System Settings for the best experience."
      />
    </Form>
  );
}
