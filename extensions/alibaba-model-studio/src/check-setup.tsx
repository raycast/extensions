import {
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
  acceptsWorkspaceHeader,
  consoleURL,
  getPreferences,
  parseExtraModels,
  platformTitle,
  probeModelsEndpoint,
  probeWorkspace,
  resolveBaseURL,
} from "./lib/catalog";
import { formatModelLine, redactEndpoint } from "./lib/format";
import { refreshModelsWithToast } from "./lib/refresh";

type FormValues = {
  platform: string;
  apiKey?: string;
  customBaseUrl?: string;
  workspaceId?: string;
};

/** One-line summary of the saved preferences for the form's Saved Settings row. */
function savedSettingsSummary(
  prefs: ReturnType<typeof getPreferences>,
): string {
  const parts = [
    `Platform: ${platformTitle(prefs.platform)}`,
    `API key: ${prefs.apiKey ? "set ✓" : "not set ✗"}`,
  ];
  if (prefs.workspaceId) parts.push(`Workspace: ${prefs.workspaceId}`);
  if (prefs.platform === "custom") {
    parts.push(
      `Custom Base URL: ${prefs.customBaseUrl ? redactEndpoint(prefs.customBaseUrl) : "not set ✗"}`,
    );
  }
  return parts.join(" · ");
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
  // Pre-rendered model lines, set only when the validated combination is the
  // saved one — getModels() reads the saved preferences, so listing after a
  // "validated, but not applied" probe would show the wrong setup.
  const [modelLines, setModelLines] = useState<string[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  // isValidating alone can't stop a double-submit: React hasn't flushed the
  // state within the same tick, so two rapid submits both see false.
  const validating = useRef(false);

  async function validate(values: FormValues) {
    if (validating.current) return;
    validating.current = true;
    setIsValidating(true);
    setResult(null);
    setModelLines(null);
    try {
      const saved = getPreferences();
      const enteredKey = (values.apiKey ?? "").trim();
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
        // resolveBaseURL rejects Custom URLs carrying a query string (the
        // request path is appended to them), so name that failure instead of
        // sending the user hunting for an HTTPS problem they don't have.
        const enteredUrl = (values.customBaseUrl ?? saved.customBaseUrl).trim();
        let hasQuery = false;
        try {
          hasQuery = Boolean(new URL(enteredUrl).search);
        } catch {
          // Unparseable input — the generic message covers it.
        }
        setResult({
          ok: false,
          text: hasQuery
            ? "⚠️ Custom Base URL doesn't support query parameters: put the API key in the API Key field and use the plain base URL."
            : "⚠️ Enter a valid HTTPS base URL for the Custom platform.",
        });
        return;
      }
      const workspaceId = probeWorkspace(
        values.platform,
        values.workspaceId?.trim() ?? "",
      );

      // An explicit validation must hit the live endpoint — a cached probe
      // would report a just-revoked key as still working.
      const probe = await probeModelsEndpoint(baseURL, key, workspaceId, {
        bypassCache: true,
      });
      if (probe.ok) {
        // Extensions cannot write preferences — a combination that differs
        // from the saved one must be applied in the native settings, so say
        // so instead of implying validation switched anything.
        const keyChanged = Boolean(enteredKey) && enteredKey !== saved.apiKey;
        const platformChanged = values.platform !== saved.platform;
        // A changed Custom base URL doesn't show up in the platform value.
        const urlChanged = baseURL !== saved.baseURL;
        // A typed Workspace ID isn't saved either — the refresh and the model
        // list below both run against the saved one.
        const workspaceChanged =
          acceptsWorkspaceHeader(values.platform) &&
          workspaceId !== saved.workspaceId;
        const savedSetup =
          saved.platform === "custom"
            ? `${platformTitle(saved.platform)} (${redactEndpoint(saved.baseURL) || "no URL set"})`
            : platformTitle(saved.platform);
        // Raycast's first-run setup form only collects required preferences,
        // so a Custom setup is commonly saved with the URL still unset — which
        // makes the generic "not applied" wording baffling mid-setup: the URL
        // that just validated was typed into this form, which saves nothing.
        // Only when the validated setup is itself Custom — a user switching
        // away from Custom gets the generic "not applied" wording instead.
        const missingSavedUrl =
          values.platform === "custom" &&
          saved.platform === "custom" &&
          !saved.customBaseUrl;
        let unsaved = "";
        if (keyChanged || platformChanged || urlChanged || workspaceChanged) {
          unsaved = missingSavedUrl
            ? `\n\nThis command only validates — nothing typed here is saved, and no Custom Base URL is stored yet (the first-run setup form doesn't ask for one). Open Extension Preferences → Custom Base URL, paste the URL you entered above, then run Refresh Models.`
            : `\n\nValidated, but not applied — the saved setup is still ${savedSetup}. Update the extension preferences, then run Refresh Models.`;
        }
        setResult({
          ok: true,
          text: `✅ Working — ${probe.ids.length} models discovered on ${redactEndpoint(baseURL)}.${unsaved}`,
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
          // The shared refresh bypasses both discovery caches; its fresh
          // discovery is exactly what the picker now serves, so the list
          // below renders from it instead of re-running discovery — and is
          // skipped when the refresh failed, consistent with its toast.
          const outcome = await refreshModelsWithToast();
          if (outcome?.status === "ok") {
            const extraIds = new Set(parseExtraModels(saved.extraModels));
            setModelLines(
              outcome.models.map((model) =>
                formatModelLine(model, {
                  isExtra:
                    extraIds.has(model.id) && !probe.ids.includes(model.id),
                }),
              ),
            );
          }
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
            title="Open Model Studio Console"
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
        onChange={(value) => {
          setPlatform(value);
          // The previous validation's result describes another platform.
          setResult(null);
          setModelLines(null);
        }}
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
        <>
          <Form.TextField
            id="customBaseUrl"
            title="Custom Base URL"
            defaultValue={savedDisplay.customBaseUrl}
            placeholder="https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
          />
          {!savedDisplay.customBaseUrl && (
            <Form.Description
              title="Hint"
              text="No Custom Base URL is saved yet — Raycast's first-run setup form only asks for the API key and platform. Anything typed here is used for this validation only and is never saved: set the URL in Extension Preferences, then run Refresh Models."
            />
          )}
        </>
      )}
      {acceptsWorkspaceHeader(platform) && (
        <Form.TextField
          id="workspaceId"
          title="Workspace ID"
          placeholder="Optional — business space for team accounts"
          defaultValue={savedDisplay.workspaceId}
        />
      )}
      <Form.Description
        title="Saved Settings"
        text={savedSettingsSummary(savedDisplay)}
      />
      {result && <Form.Description title="Result" text={result.text} />}
      {modelLines && modelLines.length > 0 && (
        <Form.Description
          title={`Available in Raycast AI (${modelLines.length})`}
          text={[
            ...modelLines.slice(0, 8),
            ...(modelLines.length > 8
              ? [
                  `… and ${modelLines.length - 8} more — run Show Models for the full list`,
                ]
              : []),
          ].join("\n")}
        />
      )}
      {modelLines && modelLines.length === 0 && (
        <Form.Description
          title="Available in Raycast AI"
          text={
            savedPlatform === "custom"
              ? "Raycast AI has no models registered from this setup — add model IDs via the Extra Models preference."
              : "Raycast AI has no models registered from this setup."
          }
        />
      )}
    </Form>
  );
}
