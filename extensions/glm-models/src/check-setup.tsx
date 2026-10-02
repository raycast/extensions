import {
  AI,
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  PLATFORM_OPTIONS,
  consoleURL,
  getPreferences,
  platformTitle,
  probeModelsEndpoint,
  resolveBaseURL,
} from "./lib/catalog";

type FormValues = { platform: string; apiKey: string; customBaseUrl: string };

async function refreshModelsWithToast() {
  try {
    await AI.refreshModels();
    await showToast({
      style: Toast.Style.Success,
      title: "Model list refreshed",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Refresh failed" });
  }
}

export default function CheckSetup() {
  // Render-time snapshot, for display only — preferences edited elsewhere
  // while the form is open don't re-render this component; validate() reads
  // them fresh at submit time.
  const savedDisplay = getPreferences();
  const savedPlatform = savedDisplay.platform;
  const [platform, setPlatform] = useState(savedPlatform);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);
  // isValidating alone can't stop a double-submit: React hasn't flushed the
  // state within the same tick, so two rapid submits both see false.
  const validating = useRef(false);

  async function validate(values: FormValues) {
    if (validating.current) return;
    validating.current = true;
    setIsValidating(true);
    setResult(null);
    try {
      const saved = getPreferences();
      const enteredKey = values.apiKey.trim();
      const key = enteredKey || saved.apiKey;
      if (!key) {
        setResult({
          ok: false,
          text: "⚠️ Enter an API key above, or set one in the extension preferences.",
        });
        return;
      }
      const baseURL = resolveBaseURL(
        values.platform,
        // Unmounted fields submit undefined — fall back to the saved value.
        values.customBaseUrl ?? saved.customBaseUrl,
      );
      if (!baseURL) {
        setResult({
          ok: false,
          text: "⚠️ Enter a valid HTTPS base URL for the Custom platform.",
        });
        return;
      }

      const probe = await probeModelsEndpoint(baseURL, key);
      if (probe.ok) {
        // Extensions cannot write preferences — a combination that differs
        // from the saved one must be applied in the native settings, so say
        // so instead of implying validation switched anything.
        const keyChanged = Boolean(enteredKey) && enteredKey !== saved.apiKey;
        const platformChanged = values.platform !== saved.platform;
        // A changed Custom base URL doesn't show up in the platform value.
        const urlChanged = baseURL !== saved.baseURL;
        const savedSetup =
          saved.platform === "custom"
            ? `${platformTitle(saved.platform)} (${saved.baseURL || "no URL set"})`
            : platformTitle(saved.platform);
        const unsaved =
          keyChanged || platformChanged || urlChanged
            ? `\n\nValidated, but not applied — the saved setup is still ${savedSetup}. Update the extension preferences, then run Refresh Models.`
            : "";
        setResult({
          ok: true,
          text: `✅ Working — ${probe.ids.length} models discovered on ${baseURL}.${unsaved}`,
        });
        if (unsaved) {
          await showToast({
            style: Toast.Style.Success,
            title: "Validated — not applied",
            message: "Update the extension preferences to use it.",
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Setup is working",
          });
          // Validating the saved setup — realign Raycast's model list too.
          await refreshModelsWithToast();
        }
      } else {
        setResult({ ok: false, text: `❌ ${probe.message}` });
        await showFailureToast(probe.message, { title: "Validation failed" });
      }
    } finally {
      validating.current = false;
      setIsValidating(false);
    }
  }

  return (
    <Form
      isLoading={isValidating}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Validate"
            onSubmit={(values) => validate(values as FormValues)}
          />
          <Action
            title="Refresh Models"
            icon={Icon.ArrowClockwise}
            onAction={() => void refreshModelsWithToast()}
          />
          <Action
            title="Open Platform Console"
            icon={Icon.Globe}
            onAction={() => void open(consoleURL(platform))}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={() => void openExtensionPreferences()}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Check Setup"
        text="Validates an API key and platform combination against the selected platform's live API. Fields are pre-filled from your saved preferences — leave the key empty to validate the saved one."
      />
      <Form.Dropdown
        id="platform"
        title="Platform"
        defaultValue={savedPlatform}
        onChange={setPlatform}
      >
        {PLATFORM_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder={
          savedDisplay.apiKey
            ? "Using saved key — type to test a different one"
            : "Enter your API key"
        }
      />
      {platform === "custom" && (
        <Form.TextField
          id="customBaseUrl"
          title="Custom Base URL"
          defaultValue={savedDisplay.customBaseUrl}
          placeholder="https://open.bigmodel.cn/api/paas/v4"
        />
      )}
      <Form.Description
        title="Saved Settings"
        text={`Platform: ${platformTitle(savedPlatform)} · API key: ${savedDisplay.apiKey ? "set ✓" : "not set ✗"}`}
      />
      {result && <Form.Description title="Result" text={result.text} />}
    </Form>
  );
}
