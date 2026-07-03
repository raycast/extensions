import { Action, ActionPanel, Clipboard, Color, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  type Claim,
  type DecodedJwt,
  algFamily,
  buildClaims,
  decodeJwt,
  pemToKey,
  tokenAlg,
  verifyWithKey,
  verifyWithSecret,
} from "./lib/jwt";
import { resolveVerificationKey } from "./lib/jwks";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The outcome of an explicit signature-verification request. */
type VerifyState =
  | { status: "idle" }
  | { status: "valid"; detail: string }
  | { status: "invalid"; detail: string }
  | { status: "error"; detail: string };

// The well-known jwt.io sample token, for an empty-state demo.
const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ" +
  ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

function claimIcon(claim: Claim): { source: Icon; tintColor?: Color } {
  if (claim.time) {
    const tint =
      claim.time.state === "expired"
        ? Color.Red
        : claim.time.state === "future"
          ? Color.Orange
          : claim.time.state === "valid"
            ? Color.Green
            : Color.SecondaryText;
    return { source: Icon.Clock, tintColor: tint };
  }
  return claim.isStandard ? { source: Icon.Tag, tintColor: Color.Blue } : { source: Icon.Dot };
}

/** The signature footer line, reflecting the latest verification result. */
function signatureLine(decoded: DecodedJwt, verify: VerifyState): string {
  const size = decoded.signatureBytes === 0 ? "none (unsigned)" : `${decoded.signatureBytes} bytes`;
  const head = `Signature · ${tokenAlg(decoded)} · ${size}`;
  switch (verify.status) {
    case "valid":
      return `*${head} · ✅ verified (key from ${verify.detail}).*`;
    case "invalid":
      return `*${head} · ❌ invalid (key from ${verify.detail}).*`;
    case "error":
      return `*${head} · ⚠️ ${verify.detail}*`;
    default:
      return `*${head}. Press ⌘⇧Y to verify.*`;
  }
}

/** The right-hand detail: the selected claim, then the full syntax-highlighted token. */
function claimMarkdown(claim: Claim, decoded: DecodedJwt, verify: VerifyState): string {
  const lines: string[] = [`**${claim.label}**  \`${claim.key}\``];
  if (claim.description) lines.push("", `*${claim.description}*`);
  lines.push("", "```json", JSON.stringify(claim.value, null, 2), "```");
  if (claim.time) lines.push("", `📅 **${claim.time.utc}**  ·  ⏱ ${claim.time.relative}`);
  lines.push(
    "",
    "---",
    "",
    "### Header",
    "```json",
    decoded.headerJson,
    "```",
    "",
    "### Payload",
    "```json",
    decoded.payloadJson,
    "```",
    "",
    signatureLine(decoded, verify),
  );
  return lines.join("\n");
}

/** Form pushed to paste or replace the token. */
function ImportForm({ initial, onImport }: { initial: string; onImport: (token: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle="Import JWT"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Decode Token"
            icon={Icon.Key}
            onSubmit={() => {
              const token = value.trim();
              try {
                decodeJwt(token);
              } catch (caught) {
                setError(messageOf(caught));
                return;
              }
              onImport(token);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste a JSON Web Token to decode and inspect it. It is decoded locally and never sent anywhere." />
      <Form.TextArea
        id="token"
        title="Token"
        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…"
        value={value}
        error={error}
        onChange={(next) => {
          setValue(next);
          if (error) setError(undefined);
        }}
      />
    </Form>
  );
}

/** Form pushed to verify with a manually supplied key: an HMAC secret or a PEM public key. */
function VerifyForm({ decoded, onResult }: { decoded: DecodedJwt; onResult: (state: VerifyState) => void }) {
  const { pop } = useNavigation();
  const family = algFamily(tokenAlg(decoded));
  const [secret, setSecret] = useState("");
  const [secretBase64, setSecretBase64] = useState(false);
  const [pem, setPem] = useState("");
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    try {
      let ok: boolean;
      let detail: string;
      if (family === "hmac") {
        if (!secret) {
          setError("Enter the shared secret.");
          return;
        }
        ok = verifyWithSecret(decoded, secret, secretBase64);
        detail = "the entered secret";
      } else {
        if (!pem.trim()) {
          setError("Paste the public key in PEM format.");
          return;
        }
        ok = verifyWithKey(decoded, pemToKey(pem.trim()));
        detail = "the pasted key";
      }
      onResult(ok ? { status: "valid", detail } : { status: "invalid", detail });
      await showToast({
        style: ok ? Toast.Style.Success : Toast.Style.Failure,
        title: ok ? "Signature verified" : "Invalid signature",
      });
      pop();
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  return (
    <Form
      navigationTitle="Verify Signature"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Verify" icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Algorithm: ${tokenAlg(decoded)} (${family}).`} />
      {family === "hmac" ? (
        <>
          <Form.PasswordField
            id="secret"
            title="Secret"
            placeholder="The HMAC shared secret"
            value={secret}
            error={error}
            onChange={(next) => {
              setSecret(next);
              if (error) setError(undefined);
            }}
          />
          <Form.Checkbox
            id="secretBase64"
            label="Secret is Base64-encoded"
            value={secretBase64}
            onChange={setSecretBase64}
          />
        </>
      ) : (
        <Form.TextArea
          id="pem"
          title="Public Key"
          placeholder={"-----BEGIN PUBLIC KEY-----\n…"}
          value={pem}
          error={error}
          onChange={(next) => {
            setPem(next);
            if (error) setError(undefined);
          }}
        />
      )}
    </Form>
  );
}

/** Actions for loading a token — shared by the empty state and every claim row. */
function TokenActions({ token, onImport }: { token: string; onImport: (token: string) => void }) {
  async function loadFromClipboard() {
    const clipboard = (await Clipboard.readText())?.trim();
    if (!clipboard) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
      return;
    }
    try {
      decodeJwt(clipboard);
    } catch (caught) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard is not a JWT", message: messageOf(caught) });
      return;
    }
    onImport(clipboard);
  }

  return (
    <ActionPanel.Section title="Token">
      <Action.Push
        title="Paste / Replace Token"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={<ImportForm initial={token} onImport={onImport} />}
      />
      <Action
        title="Load Token from Clipboard"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={loadFromClipboard}
      />
    </ActionPanel.Section>
  );
}

/**
 * Global copy actions present on every row: the whole header/payload/token, plus
 * quick shortcuts for the most-copied registered claims when they're present.
 */
function CopyActions({ decoded }: { decoded: DecodedJwt }) {
  const quick: { key: string; title: string; mod: "s" | "i" | "a" | "e" }[] = [
    { key: "sub", title: "Copy Subject", mod: "s" },
    { key: "iss", title: "Copy Issuer", mod: "i" },
    { key: "aud", title: "Copy Audience", mod: "a" },
    { key: "exp", title: "Copy Expiration", mod: "e" },
  ];
  return (
    <>
      <ActionPanel.Section title="Copy Whole">
        <Action.CopyToClipboard
          title="Copy Payload (JSON)"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          content={decoded.payloadJson}
        />
        <Action.CopyToClipboard
          title="Copy Header (JSON)"
          icon={Icon.Cog}
          shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          content={decoded.headerJson}
        />
        <Action.CopyToClipboard
          title="Copy Encoded Token"
          icon={Icon.Key}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
          content={decoded.token}
        />
        {decoded.signature && (
          <Action.CopyToClipboard
            title="Copy Signature"
            icon={Icon.Fingerprint}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
            content={decoded.signature}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Standard Claim">
        {quick
          .filter((q) => q.key in decoded.payload)
          .map((q) => (
            <Action.CopyToClipboard
              key={q.key}
              title={q.title}
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd", "shift"], key: q.mod }}
              content={
                typeof decoded.payload[q.key] === "string"
                  ? (decoded.payload[q.key] as string)
                  : JSON.stringify(decoded.payload[q.key])
              }
            />
          ))}
      </ActionPanel.Section>
    </>
  );
}

export default function Command() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [verify, setVerify] = useState<VerifyState>({ status: "idle" });

  // Replacing the token invalidates any prior verification result.
  function importToken(next: string) {
    setToken(next);
    setVerify({ status: "idle" });
  }

  // Verify on explicit request, auto-resolving the public key from the token's own
  // jwk/x5c/jku/x5u headers or its issuer's discovery document. Never runs on its own.
  async function verifyAuto(decoded: DecodedJwt) {
    const alg = tokenAlg(decoded);
    const family = algFamily(alg);
    if (family === "none") {
      await showToast({ style: Toast.Style.Failure, title: "Unsigned token", message: 'The header alg is "none".' });
      return;
    }
    if (family === "hmac") {
      await showToast({
        style: Toast.Style.Failure,
        title: "HMAC can't auto-resolve a key",
        message: "It needs a shared secret — use “Verify with Key or Secret…” (⌘⇧K).",
      });
      return;
    }
    if (family === "unknown") {
      await showToast({ style: Toast.Style.Failure, title: `Unsupported algorithm "${alg}"` });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Resolving public key…" });
    try {
      const { key, source } = await resolveVerificationKey(decoded);
      const ok = verifyWithKey(decoded, key);
      setVerify(ok ? { status: "valid", detail: source } : { status: "invalid", detail: source });
      toast.style = ok ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = ok ? "Signature verified" : "Invalid signature";
      toast.message = `Key from ${source}`;
    } catch (caught) {
      const detail = messageOf(caught);
      setVerify({ status: "error", detail });
      toast.style = Toast.Style.Failure;
      toast.title = "Could not verify";
      toast.message = detail;
    }
  }

  // Prefill from the clipboard on open, but only when it actually parses as a JWT.
  useEffect(() => {
    (async () => {
      const clipboard = (await Clipboard.readText())?.trim();
      if (clipboard) {
        try {
          decodeJwt(clipboard);
          setToken(clipboard);
        } catch {
          // Not a JWT — start on the empty state.
        }
      }
      setLoading(false);
    })();
  }, []);

  const result = (() => {
    if (!token) return null;
    try {
      return { decoded: decodeJwt(token), nowMs: Date.now() };
    } catch (caught) {
      return { error: messageOf(caught) };
    }
  })();

  if (!result || "error" in result) {
    return (
      <List isLoading={loading} navigationTitle="JWT Inspector">
        <List.EmptyView
          icon={result && "error" in result ? Icon.ExclamationMark : Icon.Key}
          title={result && "error" in result ? "Not a valid JWT" : "No token loaded"}
          description={
            result && "error" in result ? result.error : "Paste a token (⌘N) or load one from the clipboard (⌘⇧V)."
          }
          actions={
            <ActionPanel>
              <TokenActions token={token} onImport={importToken} />
              <Action title="Load Sample Token" icon={Icon.Stars} onAction={() => importToken(SAMPLE_TOKEN)} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { decoded, nowMs } = result;
  const sections: { name: string; claims: Claim[] }[] = [
    { name: "Payload", claims: buildClaims(decoded.payload, "payload", nowMs) },
    { name: "Header", claims: buildClaims(decoded.header, "header", nowMs) },
  ];

  return (
    <List isShowingDetail navigationTitle="JWT Inspector" searchBarPlaceholder="Filter claims…">
      {sections.map(({ name, claims }) => (
        <List.Section key={name} title={name} subtitle={`${claims.length} claim${claims.length === 1 ? "" : "s"}`}>
          {claims.map((claim) => (
            <List.Item
              key={`${name}:${claim.key}`}
              icon={claimIcon(claim)}
              title={claim.label}
              subtitle={claim.time ? { value: claim.preview, tooltip: claim.time.tooltip } : claim.preview}
              keywords={[claim.key]}
              detail={<List.Item.Detail markdown={claimMarkdown(claim, decoded, verify)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title={`${claim.label} (${claim.key})`}>
                    <Action.CopyToClipboard title={`Copy ${claim.label} Value`} content={claim.copyText} />
                    {claim.time && (
                      <Action.CopyToClipboard title="Copy as ISO Date" icon={Icon.Calendar} content={claim.time.iso} />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Claim Name"
                      icon={Icon.Text}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                      content={claim.key}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Signature">
                    <Action
                      title="Verify Signature"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
                      onAction={() => verifyAuto(decoded)}
                    />
                    <Action.Push
                      title="Verify with Key or Secret…"
                      icon={Icon.Key}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                      target={<VerifyForm decoded={decoded} onResult={setVerify} />}
                    />
                  </ActionPanel.Section>
                  <CopyActions decoded={decoded} />
                  <TokenActions token={decoded.token} onImport={importToken} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
