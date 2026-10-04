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
  consoleURL,
  getModels,
  getPreferences,
  parseExtraModels,
  platformTitle,
  probeModelsEndpoint,
  resolveBaseURL,
} from "./lib/catalog";
import { formatModelLine, redactEndpoint } from "./lib/format";
import { log } from "./lib/log";
import { refreshModelsWithToast } from "./lib/refresh";

type FormValues = { platform: string; apiKey: string; customBaseUrl: string };

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
  // Bumper for the out-of-band bonus-list fetches: a slow fetch from an older
  // validation must never overwrite a newer one's state.
  const listRequestRef = useRef(0);

  async function validate(values: FormValues) {
    if (validating.current) return;
    validating.current = true;
    setIsValidating(true);
    setResult(null);
    setModelLines(null);
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

      // An explicit validation must hit the live endpoint — a cached probe
      // would report a just-revoked key as still working.
      const probe = await probeModelsEndpoint(baseURL, key, {
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
        if (keyChanged || platformChanged || urlChanged) {
          unsaved = missingSavedUrl
            ? `\n\nThis command only validates — nothing typed here is saved, and no Custom Base URL is stored yet (the first-run setup form doesn't ask for one). Open Extension Preferences → Custom Base URL, paste ${baseURL}, then run Refresh Models.`
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
          // The shared refresh bypasses both discovery caches and warms them
          // again, so the bonus list below is served from cache.
          await refreshModelsWithToast();
          // The list is a bonus — fetch it out of band so it never holds the
          // validation spinner. A stale fetch from an earlier validation is
          // dropped instead of overwriting the latest state.
          const request = ++listRequestRef.current;
          const extraIds = new Set(parseExtraModels(saved.extraModels));
          void getModels()
            .then((registered) => {
              if (listRequestRef.current !== request) return;
              setModelLines(
                registered.map((model) =>
                  formatModelLine(model, {
                    isExtra:
                      extraIds.has(model.id) && !probe.ids.includes(model.id),
                  }),
                ),
              );
            })
            .catch((error) => {
              if (listRequestRef.current !== request) return;
              // The result row already says the setup works — a list is a
              // bonus; keep the silent UI but leave a dev-console breadcrumb.
              log(
                `model list unavailable (${error instanceof Error ? error.message : String(error)})`,
              );
              setModelLines(null);
            });
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
        <>
          <Form.TextField
            id="customBaseUrl"
            title="Custom Base URL"
            defaultValue={savedDisplay.customBaseUrl}
            placeholder="https://open.bigmodel.cn/api/paas/v4"
          />
          {!savedDisplay.customBaseUrl && (
            <Form.Description
              title="Hint"
              text="No Custom Base URL is saved yet — Raycast's first-run setup form only asks for the API key and platform. Anything typed here is used for this validation only and is never saved: set the URL in Extension Preferences, then run Refresh Models."
            />
          )}
        </>
      )}
      <Form.Description
        title="Saved Settings"
        text={`Platform: ${platformTitle(savedPlatform)} · API key: ${
          savedDisplay.apiKey ? "set ✓" : "not set ✗"
        }${
          savedPlatform === "custom"
            ? ` · Custom Base URL: ${
                savedDisplay.customBaseUrl
                  ? redactEndpoint(savedDisplay.customBaseUrl)
                  : "not set ✗"
              }`
            : ""
        }`}
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
              ? "Raycast AI has no GLM models registered from this setup — add model IDs via the Extra Models preference."
              : "Raycast AI has no GLM models registered from this setup."
          }
        />
      )}
    </Form>
  );
}
