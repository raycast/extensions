import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import {
  loadSettings,
  saveSettings,
  startServerForSettings,
} from "./lib/raycast-glue";
import {
  browserOptions,
  detectInstalledBrowsers,
  errorMessage,
  FONT_PRESETS,
  isDarwin,
  type ShowmdSettings,
} from "./lib/showmd";
import FeedbackSection from "./components/FeedbackSection";

function validateFontSize(value: string): string | undefined {
  const n = Number(value);
  if (!value.trim() || Number.isNaN(n) || n < 10 || n > 32) {
    return "Enter a number between 10 and 32";
  }
  return undefined;
}

interface EditableSettings {
  colorMode: string;
  openMode: string;
  fontPreset: string;
  fontSize: string;
  browser: string;
  port: string;
  updateCheck: boolean;
}

const DEFAULT_FORM: EditableSettings = {
  colorMode: "system",
  openMode: "read",
  fontPreset: "default",
  fontSize: "15.5",
  browser: "default",
  port: "4321",
  updateCheck: true,
};

function formFromSettings(settings: ShowmdSettings): EditableSettings {
  return {
    colorMode: settings.colorMode,
    openMode: settings.openMode,
    fontPreset: settings.fontPreset,
    fontSize: String(settings.fontSize),
    browser: settings.browser,
    port: String(settings.port),
    updateCheck: settings.updateCheck,
  };
}

export default function EditSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [original, setOriginal] = useState<ShowmdSettings | null>(null);
  const [form, setForm] = useState<EditableSettings>(DEFAULT_FORM);
  const [fontSizeError, setFontSizeError] = useState<string | undefined>();
  const [detectedBrowsers, setDetectedBrowsers] = useState<string[]>([]);
  const isMac = isDarwin(process.platform);

  function updateForm(patch: Partial<EditableSettings>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  async function load() {
    setIsLoading(true);
    try {
      const settings = await loadSettings();
      setOriginal(settings);
      if (settings) setForm(formFromSettings(settings));
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load settings",
        message: errorMessage(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (isMac) setDetectedBrowsers(detectInstalledBrowsers());
  }, []);

  async function handleSubmit() {
    if (!original) return;
    const error = validateFontSize(form.fontSize);
    setFontSizeError(error);
    if (error) return;

    const portNum = Number(form.port);
    const current: ShowmdSettings = {
      colorMode: form.colorMode,
      openMode: form.openMode,
      fontPreset: form.fontPreset,
      fontSize: Number(form.fontSize),
      browser: form.browser,
      port: Number.isInteger(portNum) ? portNum : original.port,
      updateCheck: form.updateCheck,
    };

    setIsLoading(true);
    try {
      const ok = await saveSettings(original, current);
      await showToast({
        style: ok ? Toast.Style.Success : Toast.Style.Failure,
        title: ok ? "Settings saved" : "Could not save settings",
      });
      if (ok) setOriginal(current);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStart() {
    setIsLoading(true);
    const ok = await startServerForSettings();
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "ShowMD started" : "Could not start ShowMD",
    });
    await load();
  }

  if (!isLoading && !original) {
    return (
      <Detail
        markdown="ShowMD is not running. Start it to edit its settings."
        actions={
          <ActionPanel>
            <Action
              title="Start ShowMD"
              icon={Icon.Play}
              onAction={handleStart}
            />
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={load} />
            <FeedbackSection />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
          <FeedbackSection />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="colorMode"
        title="Color Mode"
        value={form.colorMode}
        onChange={(colorMode) => updateForm({ colorMode })}
      >
        <Form.Dropdown.Item value="system" title="System" />
        <Form.Dropdown.Item value="light" title="Light" />
        <Form.Dropdown.Item value="dark" title="Dark" />
      </Form.Dropdown>
      <Form.Dropdown
        id="openMode"
        title="Open Mode"
        value={form.openMode}
        onChange={(openMode) => updateForm({ openMode })}
      >
        <Form.Dropdown.Item value="read" title="Read" />
        <Form.Dropdown.Item value="edit" title="Edit" />
      </Form.Dropdown>
      <Form.Dropdown
        id="fontPreset"
        title="Font Preset"
        value={form.fontPreset}
        onChange={(fontPreset) => updateForm({ fontPreset })}
      >
        {FONT_PRESETS.map((preset) => (
          <Form.Dropdown.Item key={preset} value={preset} title={preset} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="fontSize"
        title="Font Size"
        value={form.fontSize}
        error={fontSizeError}
        onChange={(fontSize) => {
          updateForm({ fontSize });
          if (fontSizeError) setFontSizeError(validateFontSize(fontSize));
        }}
        onBlur={(event) =>
          setFontSizeError(validateFontSize(event.target.value ?? ""))
        }
      />
      {isMac ? (
        <Form.Dropdown
          id="browser"
          title="Browser"
          value={form.browser}
          onChange={(browser) => updateForm({ browser })}
        >
          {browserOptions(detectedBrowsers, form.browser).map((name) => (
            <Form.Dropdown.Item
              key={name}
              value={name}
              title={name === "default" ? "Default" : name}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField
          id="browser"
          title="Browser"
          value={form.browser}
          onChange={(browser) => updateForm({ browser })}
        />
      )}
      <Form.TextField
        id="port"
        title="Port"
        value={form.port}
        onChange={(port) => updateForm({ port })}
      />
      <Form.Checkbox
        id="updateCheck"
        title="Update Check"
        label="Check for updates"
        value={form.updateCheck}
        onChange={(updateCheck) => updateForm({ updateCheck })}
      />
    </Form>
  );
}
