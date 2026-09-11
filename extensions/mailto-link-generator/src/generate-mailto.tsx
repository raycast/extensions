import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  getPreferenceValues,
  Icon,
  LocalStorage,
  open,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";

/** Key under which the last-used form values are persisted (only when enabled). */
const STORAGE_KEY = "mailto-form-values";

/** Above this length some OS mail handlers truncate the link, so we warn. */
const TRUNCATION_WARNING_LENGTH = 1800;

interface MailtoFields {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

/**
 * Lenient email check. We deliberately avoid full RFC 5322 validation — it is
 * famously hard to get right and rejects many valid, real-world addresses.
 * This only catches obvious typos (missing @, missing domain dot, stray spaces).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Split a recipient field into individual addresses. Accepts comma, semicolon
 *  or newline separators so pasting from any source "just works". */
function parseAddresses(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((address) => address.trim())
    .filter(Boolean);
}

/** Returns the addresses in a field that fail validation (empty list = all good). */
function invalidAddresses(input: string): string[] {
  return parseAddresses(input).filter((address) => !EMAIL_RE.test(address));
}

/**
 * Encode a single email address for a URI.
 *
 * encodeURIComponent already does the RFC-6068-correct thing: spaces -> %20,
 * "+" -> %2B (important: "+" must NOT become a space, e.g. bill+ietf@example.org).
 * It also turns "@" into %40, which is valid but ugly, so we restore it for
 * readability — every major mail client and webmail accepts a bare "@".
 */
function encodeAddress(address: string): string {
  return encodeURIComponent(address).replace(/%40/g, "@");
}

/** Join a recipient field into an encoded, comma-separated address list. */
function encodeRecipients(input: string): string {
  return parseAddresses(input).map(encodeAddress).join(",");
}

/**
 * Encode a header value (subject / body) for the query string.
 *
 * RFC 6068 requires body line breaks to be encoded as CRLF ("%0D%0A"). A text
 * area gives us bare "\n", so we normalise every line ending to "\r\n" first,
 * then let encodeURIComponent produce the "%0D%0A" sequences.
 */
function encodeField(value: string): string {
  return encodeURIComponent(value.replace(/\r\n|\r|\n/g, "\r\n"));
}

/**
 * Encoded query params shared by every link format: cc, bcc, subject, body.
 * `subjectKey` differs by target ("subject" for mailto/Outlook, "su" for Gmail).
 * Each recipient field is encoded exactly once.
 */
function sharedParams({ cc, bcc, subject, body }: MailtoFields, subjectKey: "subject" | "su"): string[] {
  const params: string[] = [];
  const ccList = encodeRecipients(cc);
  const bccList = encodeRecipients(bcc);
  if (ccList) params.push(`cc=${ccList}`);
  if (bccList) params.push(`bcc=${bccList}`);
  if (subject.trim()) params.push(`${subjectKey}=${encodeField(subject)}`);
  if (body.trim()) params.push(`body=${encodeField(body)}`);
  return params;
}

/** Build the full mailto: URI from the raw form fields. */
function buildMailto(fields: MailtoFields): string {
  const params = sharedParams(fields, "subject");
  const query = params.length ? `?${params.join("&")}` : "";
  return `mailto:${encodeRecipients(fields.to)}${query}`;
}

/** Build a Gmail web "compose" URL (uses `su` for the subject). */
function buildGmailUrl(fields: MailtoFields): string {
  const to = encodeRecipients(fields.to);
  const params: string[] = ["view=cm", "fs=1"];
  if (to) params.push(`to=${to}`);
  params.push(...sharedParams(fields, "su"));
  return `https://mail.google.com/mail/?${params.join("&")}`;
}

/** Build an Outlook web "deeplink/compose" URL for the configured host. */
function buildOutlookUrl(fields: MailtoFields, host: string): string {
  const to = encodeRecipients(fields.to);
  const params: string[] = to ? [`to=${to}`] : [];
  params.push(...sharedParams(fields, "subject"));
  const query = params.length ? `?${params.join("&")}` : "";
  return `https://${host}/mail/deeplink/compose${query}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Wrap the mailto link in an HTML anchor. In HTML the "&" that separates query
 * parameters must be written as the entity "&amp;", otherwise the markup is
 * invalid and some parsers truncate the href at the first "&".
 */
function buildHtmlAnchor(mailto: string, label: string): string {
  const href = mailto.replace(/&/g, "&amp;");
  return `<a href="${href}">${escapeHtml(label || "email")}</a>`;
}

/** Optional signature for the body, after a standard "-- " delimiter. */
function initialBody(signature: string): string {
  return signature ? `\n\n-- \n${signature}` : "";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.GenerateMailto>();
  // Allow multi-line signatures via a literal "\n" in the single-line preference field.
  const signature = (preferences.signature ?? "").replace(/\\n/g, "\n");

  // Seed from the (opt-in) preference defaults. All empty by default → empty form.
  const [to, setTo] = useState("");
  const [cc, setCc] = useState(preferences.defaultCc ?? "");
  const [bcc, setBcc] = useState(preferences.defaultBcc ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(() => initialBody(signature));

  const [toError, setToError] = useState<string | undefined>();
  const [ccError, setCcError] = useState<string | undefined>();
  const [bccError, setBccError] = useState<string | undefined>();

  // Restore the last-used values only when the user opted in (overrides defaults).
  useEffect(() => {
    if (!preferences.rememberLastValues) return;
    (async () => {
      const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<MailtoFields>;
        setTo(saved.to ?? "");
        setCc(saved.cc ?? preferences.defaultCc ?? "");
        setBcc(saved.bcc ?? preferences.defaultBcc ?? "");
        setSubject(saved.subject ?? "");
        setBody(saved.body ?? initialBody(signature));
      } catch {
        // Corrupt snapshot — ignore and keep the seeded defaults.
      }
    })();
    // Runs once on mount to restore the saved snapshot; intentionally no deps.
  }, []);

  const fields: MailtoFields = { to, cc, bcc, subject, body };
  const mailto = buildMailto(fields);
  const hasContent =
    parseAddresses(to).length > 0 ||
    parseAddresses(cc).length > 0 ||
    parseAddresses(bcc).length > 0 ||
    subject.trim().length > 0 ||
    body.trim().length > 0;

  const previewWarning = mailto.length > TRUNCATION_WARNING_LENGTH ? " · ⚠ long links may be truncated" : "";

  function validateField(value: string, setError: (error: string | undefined) => void): boolean {
    const bad = invalidAddresses(value);
    setError(bad.length > 0 ? `Invalid address: ${bad.join(", ")}` : undefined);
    return bad.length === 0;
  }

  function validateAll(): boolean {
    // Validate every field (avoid short-circuit so all errors surface at once).
    const results = [validateField(to, setToError), validateField(cc, setCcError), validateField(bcc, setBccError)];
    return results.every(Boolean);
  }

  async function persist() {
    if (!preferences.rememberLastValues) return;
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  }

  /** Validate, optionally remember the values, then run a copy/open action. */
  async function run(action: () => Promise<void>) {
    if (!validateAll()) {
      await showToast({ style: Toast.Style.Failure, title: "Fix the highlighted email addresses" });
      return;
    }
    if (!hasContent) {
      await showToast({ style: Toast.Style.Failure, title: "Add a recipient, subject or body first" });
      return;
    }
    await persist(); // persist BEFORE the action, which may close the window via showHUD
    await action();
  }

  async function resetForm() {
    await LocalStorage.removeItem(STORAGE_KEY);
    setTo("");
    setCc(preferences.defaultCc ?? "");
    setBcc(preferences.defaultBcc ?? "");
    setSubject("");
    setBody(initialBody(signature));
    setToError(undefined);
    setCcError(undefined);
    setBccError(undefined);
    await showToast({ style: Toast.Style.Success, title: "Form reset" });
  }

  async function openTarget(target: string, openingMessage: string, failureTitle: string) {
    try {
      await open(target);
      await showHUD(openingMessage);
    } catch {
      await showToast({ style: Toast.Style.Failure, title: failureTitle });
    }
  }

  return (
    <Form
      navigationTitle="Generate Mailto Link"
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case -- "mailto:" is a lowercase URI scheme, not Title Case
              title="Copy mailto: Link"
              icon={Icon.Clipboard}
              onAction={() =>
                run(async () => {
                  await Clipboard.copy(mailto);
                  await showHUD("Copied mailto: link");
                })
              }
            />
            <Action
              title="Copy as HTML Anchor"
              icon={Icon.Code}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={() =>
                run(async () => {
                  await Clipboard.copy(buildHtmlAnchor(mailto, to || subject));
                  await showHUD("Copied HTML anchor");
                })
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Open Draft">
            <Action
              title="Open in Default Mail App"
              icon={Icon.Envelope}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() =>
                run(() =>
                  openTarget(
                    mailto,
                    "Opening draft…",
                    "Could not open a mail client (no default mailto: handler set in macOS)",
                  ),
                )
              }
            />
            <Action
              title="Open in Gmail"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "g" }}
              onAction={() => run(() => openTarget(buildGmailUrl(fields), "Opening Gmail…", "Could not open Gmail"))}
            />
            <Action
              title="Open in Outlook"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
              onAction={() =>
                run(() =>
                  openTarget(
                    buildOutlookUrl(fields, preferences.outlookHost),
                    "Opening Outlook…",
                    "Could not open Outlook",
                  ),
                )
              }
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Form">
            <Action
              title="Reset Form"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={resetForm}
            />
            <Action title="Configure Defaults…" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        id="to"
        title="To"
        placeholder="alice@example.com, bob@example.com"
        info="Separate multiple recipients with a comma, semicolon or new line. Leave empty for a reusable template."
        value={to}
        error={toError}
        onChange={(value) => {
          setTo(value);
          if (toError) setToError(undefined);
        }}
        onBlur={(event) => validateField(event.target.value ?? "", setToError)}
      />
      <Form.TextField
        id="cc"
        title="Cc"
        placeholder="carol@example.com"
        value={cc}
        error={ccError}
        onChange={(value) => {
          setCc(value);
          if (ccError) setCcError(undefined);
        }}
        onBlur={(event) => validateField(event.target.value ?? "", setCcError)}
      />
      <Form.TextField
        id="bcc"
        title="Bcc"
        placeholder="dave@example.com"
        value={bcc}
        error={bccError}
        onChange={(value) => {
          setBcc(value);
          if (bccError) setBccError(undefined);
        }}
        onBlur={(event) => validateField(event.target.value ?? "", setBccError)}
      />
      <Form.TextField id="subject" title="Subject" placeholder="Subject line" value={subject} onChange={setSubject} />
      <Form.TextArea
        id="body"
        title="Body"
        placeholder="Write your message… line breaks are preserved."
        info="Line breaks are preserved and encoded as CRLF, per RFC 6068."
        value={body}
        onChange={setBody}
      />
      <Form.Separator />
      <Form.Description title={`Preview · ${mailto.length} chars${previewWarning}`} text={mailto} />
    </Form>
  );
}
