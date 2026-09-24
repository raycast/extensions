import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { looksLikeCodexKey, validateKey } from "../lib/codex";
import { getPreferenceApiKey, saveApiKey } from "../lib/key";
import { CodexError } from "../lib/types";

const SIGNUP_URL = "https://dashboard.codex.io/signup";
const API_KEYS_URL = "https://dashboard.codex.io/dashboard/api-keys";

/** Wait this long after the last keystroke before checking the key with Codex. */
const CHECK_DELAY_MS = 400;
/** Show the format hint only after the user has typed this many characters. */
const FORMAT_HINT_MIN_LENGTH = 8;

type CheckResult =
  { state: "ok" } | { state: "ok-quota" } | { state: "invalid" } | { state: "network" } | { state: "failed" };

type Check = { state: "idle" } | { state: "format" } | { state: "prefilled" } | { state: "checking" } | CheckResult;

/** When to check a new field value with Codex. */
type CheckTiming = "debounced" | "now" | "on-save";

const MESSAGES = {
  checking: "Checking key…",
  prefilled: "Found a key on your clipboard. Press ⌘↵ to check and save it.",
  checkingClipboard: "Checking the key from your clipboard…",
  ok: "✓ Key works",
  okQuota: "✓ Key works, but this month's request allowance is used up",
  format: "This does not look like a Codex.io API key. Use Copy on the API Keys page.",
  invalid: "Key rejected — copy it again from the API Keys page",
  network: "Couldn't reach Codex.io — check your connection",
  failed: "Couldn't check the key — try again in a moment",
  empty: "Paste your Codex.io API key first",
  inPreferences: "Your key is set in the extension preferences. Update it there: ⌘K → Open Extension Preferences.",
};

/** Asks Codex whether the key works. Resolves to a result; never throws. */
async function checkKey(key: string, signal?: AbortSignal): Promise<CheckResult> {
  try {
    await validateKey(key, signal);
    return { state: "ok" };
  } catch (error) {
    if (error instanceof CodexError) {
      switch (error.kind) {
        case "invalid-key":
          return { state: "invalid" };
        case "quota":
          // Codex accepted the key; only the monthly allowance is spent.
          return { state: "ok-quota" };
        case "network":
          return { state: "network" };
        default:
          return { state: "failed" };
      }
    }
    return { state: "failed" };
  }
}

function isUsable(result: Check): boolean {
  return result.state === "ok" || result.state === "ok-quota";
}

function fieldError(check: Check): string | undefined {
  switch (check.state) {
    case "invalid":
      return MESSAGES.invalid;
    case "network":
      return MESSAGES.network;
    case "failed":
      return MESSAGES.failed;
    default:
      return undefined;
  }
}

function failureTitle(result: CheckResult): string {
  switch (result.state) {
    case "invalid":
      return "Codex.io rejected the key";
    case "network":
      return "Couldn't reach Codex.io";
    default:
      return "Couldn't check the key";
  }
}

const API_KEYS_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "k" };
const SIGNUP_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
const PASTE_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "v" };

export function Onboarding(props: { onDone: (apiKey: string) => void; reason?: "missing" | "rejected" }) {
  const { onDone, reason = "missing" } = props;
  const rejected = reason === "rejected";
  const keyInPreferences = rejected && getPreferenceApiKey() !== undefined;

  const [value, setValue] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [submitError, setSubmitError] = useState<string>();

  const valueRef = useRef("");
  /** When to check the next change: after typing pauses, at once, or only on save. */
  const timingRef = useRef<CheckTiming>("debounced");
  /** The key that came from the clipboard, to word the status line. */
  const clipboardKeyRef = useRef<string | undefined>(undefined);
  /** The last key Codex accepted, with its result. */
  const verifiedRef = useRef<{ key: string; result: CheckResult } | undefined>(undefined);
  const submittingRef = useRef(false);

  function updateValue(next: string, timing: CheckTiming = "debounced") {
    valueRef.current = next;
    timingRef.current = timing;
    setSubmitError(undefined);
    setValue(next);
  }

  // Check the key with Codex after the user stops typing. Abort stale checks.
  useEffect(() => {
    const key = value.trim();
    const timing = timingRef.current;
    timingRef.current = "debounced";

    if (!key) {
      setCheck({ state: "idle" });
      return;
    }
    if (!looksLikeCodexKey(key)) {
      setCheck({ state: key.length >= FORMAT_HINT_MIN_LENGTH ? "format" : "idle" });
      return;
    }
    if (verifiedRef.current?.key === key) {
      setCheck(verifiedRef.current.result);
      return;
    }

    if (timing === "on-save") {
      // Clipboard text found on open leaves the Mac only when the user saves it.
      setCheck({ state: "prefilled" });
      return;
    }

    setCheck({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(
      async () => {
        const result = await checkKey(key, controller.signal);
        if (controller.signal.aborted) return;
        if (isUsable(result)) verifiedRef.current = { key, result };
        setCheck(result);
      },
      timing === "now" ? 0 : CHECK_DELAY_MS,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  /** Put a key from the clipboard into the field. Clipboard text that does not look like a key goes nowhere. */
  async function readKeyFromClipboard(): Promise<string | undefined> {
    try {
      const text = (await Clipboard.readText())?.trim();
      return text && looksLikeCodexKey(text) ? text : undefined;
    } catch {
      return undefined;
    }
  }

  // On first render, prefill the field if the clipboard holds a key.
  useEffect(() => {
    let cancelled = false;
    readKeyFromClipboard().then((key) => {
      if (cancelled || !key || valueRef.current.trim()) return;
      clipboardKeyRef.current = key;
      updateValue(key, "on-save");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function pasteFromClipboard() {
    const key = await readKeyFromClipboard();
    if (!key) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Codex.io API key on the clipboard",
        message: "Click Copy next to your key on the API Keys page, then try again.",
      });
      return;
    }
    clipboardKeyRef.current = key;
    updateValue(key, "now");
  }

  async function submit() {
    if (submittingRef.current) return;
    const key = valueRef.current.trim();
    if (!key) {
      setSubmitError(MESSAGES.empty);
      return;
    }
    if (keyInPreferences) {
      // A key saved here would sit under the preference and never be used.
      setSubmitError(MESSAGES.inPreferences);
      return;
    }

    submittingRef.current = true;
    try {
      let result = verifiedRef.current?.key === key ? verifiedRef.current.result : undefined;
      if (!result) {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Checking key…" });
        result = await checkKey(key);
        if (valueRef.current.trim() !== key) {
          // The user changed the field while the check ran. Keep the new value and do not save.
          await toast.hide();
          return;
        }
        if (isUsable(result)) verifiedRef.current = { key, result };
        setCheck(result);
        if (!isUsable(result)) {
          toast.style = Toast.Style.Failure;
          toast.title = failureTitle(result);
          toast.message = fieldError(result);
          return;
        }
        await toast.hide();
      }

      await saveApiKey(key);
      await showToast({ style: Toast.Style.Success, title: "Codex.io key saved" });
      onDone(key);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Couldn't save the key", message: "Try again." });
    } finally {
      submittingRef.current = false;
    }
  }

  const openSignup = (shortcut?: Keyboard.Shortcut) => (
    <Action.OpenInBrowser title="Open Codex.io Signup" url={SIGNUP_URL} shortcut={shortcut} />
  );
  const openApiKeys = (shortcut?: Keyboard.Shortcut) => (
    <Action.OpenInBrowser title="Open API Keys Page" url={API_KEYS_URL} shortcut={shortcut} />
  );

  let status: string | undefined;
  if (check.state === "checking") {
    status = clipboardKeyRef.current === value.trim() ? MESSAGES.checkingClipboard : MESSAGES.checking;
  } else if (check.state === "prefilled") {
    status = MESSAGES.prefilled;
  } else if (check.state === "ok") {
    status = MESSAGES.ok;
  } else if (check.state === "ok-quota") {
    status = MESSAGES.okQuota;
  } else if (check.state === "format") {
    status = MESSAGES.format;
  }

  return (
    <Form
      navigationTitle={rejected ? "Update Codex.io API Key" : "Set Up Defined.fi Search"}
      actions={
        <ActionPanel>
          {/* In a Form, the first action runs on ⌘↵ and the second on ⌘⇧↵. */}
          <Action.SubmitForm title="Save and Start Searching" onSubmit={submit} />
          {rejected ? openApiKeys() : openSignup()}
          {rejected ? openSignup(SIGNUP_SHORTCUT) : openApiKeys(API_KEYS_SHORTCUT)}
          <Action title="Paste Key from Clipboard" onAction={pasteFromClipboard} shortcut={PASTE_SHORTCUT} />
          {keyInPreferences && <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />}
        </ActionPanel>
      }
    >
      {rejected ? (
        <>
          <Form.Description text="Codex.io rejected your saved API key. It may be revoked or mistyped. Paste a working key to continue." />
          <Form.Description title="1. Copy" text="Open the API Keys page (⌘⇧↵) and click Copy next to your key." />
        </>
      ) : (
        <>
          <Form.Description text="Defined.fi's token data comes from Codex.io. Add your own Codex.io API key to search with your own free allowance. Setup takes about 1 minute and costs $1 once." />
          <Form.Description
            title="1. Sign up"
            text="Create a Codex.io account (⌘⇧↵). One-time $1 activation by card or 1 USDC. No subscription; 10,000 requests a month."
          />
          <Form.Description title="2. Copy" text="Open the API Keys page (⌘⇧K) and click Copy next to your key." />
        </>
      )}
      <Form.PasswordField
        id="apiKey"
        title={rejected ? "2. Paste" : "3. Paste"}
        placeholder="Paste your Codex.io API key"
        value={value}
        onChange={(next) => updateValue(next)}
        error={submitError ?? fieldError(check)}
        autoFocus
      />
      {status && <Form.Description text={status} />}
      {keyInPreferences && (
        <Form.Description text="Your key is set in the extension preferences, which override this form. Update or clear it there: ⌘K → Open Extension Preferences." />
      )}
      <Form.Description text="Raycast stores the key encrypted on this Mac. Press ⌘↵ to save." />
    </Form>
  );
}
