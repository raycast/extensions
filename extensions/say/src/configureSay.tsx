import { Action, ActionPanel, Form, Icon, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { groupBy } from "lodash";
import { systemDefault } from "./constants.js";
import { getAudioDevices, isMacOS, say, supportsAudioDeviceSelection } from "./speech.js";
import {
  getAdvancedMessage,
  getSystemSettingsName,
  getSystemSettingsUrl,
  getRates,
  getSortedVoices,
  getSpeechPlist,
  languageCodeToLanguageName,
  languageCodeToEmojiFlag,
  useSaySettings,
  voiceNameToEmojiFlag,
} from "./utils.js";

const loadSayConfiguration = async () => {
  const [audioDevices, voices, speechPlist] = await Promise.all([
    supportsAudioDeviceSelection ? getAudioDevices() : [],
    getSortedVoices(),
    getSpeechPlist(),
  ]);
  return { audioDevices, voices, speechPlist };
};

export default function ConfigureSay() {
  const { data, isLoading } = useCachedPromise(loadSayConfiguration, [], {
    failureToastOptions: { title: "Could Not Load Speech Settings" },
  });
  const voices = data?.voices ?? [];
  const audioDevices = data?.audioDevices ?? [];
  const speechPlist = data?.speechPlist;
  const { voice, rate, device, keepSilentOnError, setVoice, setRate, setAudioDevice, setKeepSilentOnError } =
    useSaySettings();

  if (isLoading && !data) return <Form isLoading />;

  return (
    <Form
      isLoading={isLoading}
      searchBarAccessory={
        <Form.LinkAccessory target={getSystemSettingsUrl()} text={`Open ${getSystemSettingsName()}`} />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.SpeechBubbleActive}
            title="Say Example"
            onSubmit={async () => {
              const foundVoice = voices.find(
                (v) => (v.identifier ?? v.name) === (voice === systemDefault ? speechPlist?.voice : voice),
              );
              await say(foundVoice ? foundVoice.example : "This voice is from system settings.", {
                voice: foundVoice ? (voice === systemDefault ? undefined : voice) : undefined,
                rate: rate === systemDefault ? undefined : parseInt(rate, 10),
                audioDevice: supportsAudioDeviceSelection && device !== systemDefault ? device : undefined,
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
          title={`${speechPlist?.voice ?? "Default"} (${getSystemSettingsName()})`}
        />
        {Object.entries(groupBy(voices, (v) => languageCodeToLanguageName(v.languageCode))).map(
          ([language, voices]) => (
            <Form.Dropdown.Section key={language} title={language}>
              {voices.map((v) => (
                <Form.Dropdown.Item
                  key={v.identifier ?? `${v.name}-${v.languageCode}`}
                  value={v.identifier ?? v.name}
                  title={v.name}
                  icon={languageCodeToEmojiFlag(v.languageCode)}
                />
              ))}
            </Form.Dropdown.Section>
          ),
        )}
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
        <Form.Dropdown.Item
          value={systemDefault}
          title={`${speechPlist?.rate ?? "Default"} (${getSystemSettingsName()})`}
        />
        <Form.Dropdown.Section>
          {getRates().map((rate) => (
            <Form.Dropdown.Item key={rate} value={rate.toString()} title={rate.toString()} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      {supportsAudioDeviceSelection ? (
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
          <Form.Dropdown.Item value={systemDefault} title={`Default (${getSystemSettingsName()})`} />
          <Form.Dropdown.Section>
            {audioDevices.map((d) => (
              <Form.Dropdown.Item key={d.id} value={d.id} title={d.name} />
            ))}
          </Form.Dropdown.Section>
        </Form.Dropdown>
      ) : null}
      <Form.Checkbox
        id="keepSilentOnError"
        title="Keep Silent On Error"
        label="Enable"
        value={keepSilentOnError}
        onChange={setKeepSilentOnError}
      />
      <Form.Description title="Advanced" text={getAdvancedMessage()} />
      {isMacOS ? (
        <Form.Description
          title="Recommendation"
          text="Siri voices installed on your Mac are available above. Download more voices in System Settings → Accessibility → Read & Speak."
        />
      ) : null}
    </Form>
  );
}
