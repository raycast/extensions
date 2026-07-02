import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { AppSettingsHook } from "../hooks/useAppSettings";
import { sanitizeAppSettings } from "../runtime/app-settings";
import { supportLanguages } from "../runtime/languages";

export interface AppSettingsFormProps {
  hook: AppSettingsHook;
}

const ocrLanguages = [
  ["en-US", "English"],
  ["fr-FR", "Français"],
  ["it-IT", "Italiano"],
  ["de-DE", "Deutsch"],
  ["pt-BR", "Português"],
  ["zh-Hans", "简体中文"],
  ["zh-Hant", "正體中文"],
  ["yue-Hans", "粤语（简体）"],
  ["yue-Hant", "粵語（正體）"],
  ["ko-KR", "한국어"],
  ["ja-JP", "日本語"],
  ["ru-RU", "Русский"],
  ["uk-UA", "Українська"],
  ["th-TH", "ภาษาไทย"],
  ["vi-VT", "Tiếng Việt"],
];

export function AppSettingsForm({ hook }: AppSettingsFormProps) {
  const { pop } = useNavigation();

  async function submit(values: {
    defaultOutputLanguage: string;
    autoLoadSelected: boolean;
    autoLoadClipboard: boolean;
    autoStart: boolean;
    autoCopyToClipboard: boolean;
    maxHistorySize: string;
    alwaysShowMetadata: boolean;
    proxyMode: "system" | "none" | "socks5";
    useProxy: boolean;
    proxyHost: string;
    proxyPort: string;
    proxyUsername: string;
    proxyPassword: string;
    ocrLanguage: string;
    ocrLevel: "accurate" | "fast";
    ocrCustomWords: string;
  }) {
    await hook.save(
      sanitizeAppSettings({
        ...values,
        maxHistorySize: parseInt(values.maxHistorySize, 10),
      }),
    );
    await showToast({ title: "App settings saved", style: Toast.Style.Success });
    pop();
  }

  return (
    <Form
      navigationTitle="App Settings"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save App Settings" icon={Icon.Checkmark} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="defaultOutputLanguage"
        title="Default Output Language"
        defaultValue={hook.data.defaultOutputLanguage}
      >
        {supportLanguages.map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox
        id="autoLoadSelected"
        title="Input"
        label="Auto-load selected text"
        defaultValue={hook.data.autoLoadSelected}
      />
      <Form.Checkbox
        id="autoLoadClipboard"
        label="Auto-load clipboard text"
        defaultValue={hook.data.autoLoadClipboard}
      />
      <Form.Checkbox
        id="autoStart"
        label="Auto-start tool run after input is loaded"
        defaultValue={hook.data.autoStart}
      />
      <Form.Checkbox
        id="autoCopyToClipboard"
        title="Output"
        label="Auto-copy result to clipboard"
        defaultValue={hook.data.autoCopyToClipboard}
      />
      <Form.Checkbox
        id="alwaysShowMetadata"
        label="Show metadata by default"
        defaultValue={hook.data.alwaysShowMetadata}
      />
      <Form.TextField
        id="maxHistorySize"
        title="History Size"
        defaultValue={String(hook.data.maxHistorySize)}
        placeholder="30"
      />
      <Form.Separator />
      <Form.Dropdown id="proxyMode" title="Proxy" defaultValue={hook.data.proxyMode}>
        <Form.Dropdown.Item value="system" title="System Proxy" />
        <Form.Dropdown.Item value="none" title="No Proxy" />
        <Form.Dropdown.Item value="socks5" title="Manual SOCKS5 Proxy" />
      </Form.Dropdown>
      <Form.TextField id="proxyHost" title="Proxy Host" defaultValue={hook.data.proxyHost} />
      <Form.TextField id="proxyPort" title="Proxy Port" defaultValue={hook.data.proxyPort} />
      <Form.TextField id="proxyUsername" title="Proxy Username" defaultValue={hook.data.proxyUsername} />
      <Form.PasswordField id="proxyPassword" title="Proxy Password" defaultValue={hook.data.proxyPassword} />
      <Form.Separator />
      <Form.Dropdown id="ocrLanguage" title="OCR Language" defaultValue={hook.data.ocrLanguage}>
        {ocrLanguages.map(([value, title]) => (
          <Form.Dropdown.Item key={value} value={value} title={title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="ocrLevel" title="OCR Level" defaultValue={hook.data.ocrLevel}>
        <Form.Dropdown.Item value="accurate" title="Accurate" />
        <Form.Dropdown.Item value="fast" title="Fast" />
      </Form.Dropdown>
      <Form.TextField
        id="ocrCustomWords"
        title="OCR Custom Words"
        defaultValue={hook.data.ocrCustomWords}
        placeholder="word one, word two"
      />
    </Form>
  );
}
