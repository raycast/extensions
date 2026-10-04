import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { applyDuration, parseDurationParts } from "../lib/duration";
import { errorMessage } from "../lib/errors";
import {
  cleanToken,
  decodeToken,
  GeneratedKey,
  generateKey,
  isPlainObject,
  JWS_ALGORITHMS,
  prettyJson,
  SecretEncoding,
  signToken,
  tryParseJson,
  verifyToken,
  VerifyOutcome,
} from "../lib/tokens";
import { CompanionKey, CopyCompanionAction, isRawSecret, SecretEncodingDropdown } from "./KeyFields";
import { MODE_LABEL } from "./TokenCommand";
import { TokenDetail } from "./TokenDetail";

type SignMode = "jwt" | "jws";

export function VerifyForm({ token: initialToken, mode }: { token?: string; mode: SignMode }) {
  const [token, setToken] = useState(initialToken ?? "");
  const [key, setKey] = useState("");
  const [encoding, setEncoding] = useState<SecretEncoding>("utf8");
  const [validateClaims, setValidateClaims] = useState(mode === "jwt");
  const [outcome, setOutcome] = useState<VerifyOutcome & { error?: boolean }>();
  const [isLoading, setIsLoading] = useState(false);

  const alg = useMemo(() => {
    try {
      return String(decodeToken(token).header.alg);
    } catch {
      return undefined;
    }
  }, [token]);
  const isHmac = alg?.startsWith("HS") ?? false;

  async function submit() {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Verifying…" });
    try {
      const result = await verifyToken(token, key, { encoding, validateClaims });
      setOutcome(result);
      toast.style = result.signatureValid && result.claimsValid !== false ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = result.message;
    } catch (error) {
      setOutcome({ signatureValid: false, message: errorMessage(error), error: true });
      toast.style = Toast.Style.Failure;
      toast.title = "Verification failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  const resultText = outcome
    ? `${outcome.signatureValid ? (outcome.claimsValid === false ? "⚠️" : "✅") : outcome.error ? "⛔️" : "❌"} ${outcome.message}`
    : undefined;

  return (
    <Form
      navigationTitle={`Verify ${MODE_LABEL[mode]}`}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Verify Signature" icon={Icon.CheckCircle} onSubmit={submit} />
          {alg && (
            <Action.Push
              title="Decode Token"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<TokenDetail token={cleanToken(token)} mode={mode} />}
            />
          )}
        </ActionPanel>
      }
    >
      {resultText && <Form.Description title="Result" text={resultText} />}
      <Form.TextArea
        id="token"
        title="Token"
        placeholder="eyJhbGciOi…"
        value={token}
        onChange={(v) => {
          setToken(v);
          setOutcome(undefined);
        }}
      />
      <Form.Description title="Algorithm" text={alg ?? "—"} />
      <Form.TextArea
        id="key"
        title={isHmac ? "Secret" : "Key"}
        placeholder={
          isHmac
            ? "Shared secret"
            : "Public key / certificate (PEM), JWK, JWKS JSON or JWKS URL (https://…/.well-known/jwks.json)"
        }
        value={key}
        onChange={(v) => {
          setKey(v);
          setOutcome(undefined);
        }}
      />
      {isRawSecret(key) && <SecretEncodingDropdown value={encoding} onChange={setEncoding} />}
      <Form.Checkbox
        id="validateClaims"
        label="Validate exp / nbf claims"
        info="Requires the payload to be a JSON claims set"
        value={validateClaims}
        onChange={setValidateClaims}
      />
    </Form>
  );
}

const DEFAULT_JWT_PAYLOAD = prettyJson({ sub: "1234567890", name: "John Doe" });

export function SignForm({
  mode,
  initialHeader,
  initialPayload,
}: {
  mode: SignMode;
  initialHeader?: Record<string, unknown>;
  initialPayload?: string;
}) {
  const { push } = useNavigation();
  const { alg: initialAlg, ...extraHeader } = initialHeader ?? (mode === "jwt" ? { typ: "JWT" } : {});
  const [alg, setAlg] = useState(typeof initialAlg === "string" && initialAlg !== "none" ? initialAlg : "HS256");
  const [header, setHeader] = useState(prettyJson(extraHeader));
  const [payload, setPayload] = useState(initialPayload ?? (mode === "jwt" ? DEFAULT_JWT_PAYLOAD : "Hello, world!"));
  const [setIat, setSetIat] = useState(initialPayload === undefined);
  const [expiresIn, setExpiresIn] = useState("");
  const [key, setKey] = useState("");
  const [encoding, setEncoding] = useState<SecretEncoding>("utf8");
  const [generated, setGenerated] = useState<GeneratedKey>();
  const [errors, setErrors] = useState<Partial<Record<"header" | "payload" | "expiresIn" | "key", string>>>({});
  const isHmac = alg.startsWith("HS");

  function buildPayload(): string {
    if (mode === "jws") return payload;
    const claims = tryParseJson(payload);
    if (!isPlainObject(claims)) throw Object.assign(new Error("Payload must be a JSON object"), { field: "payload" });
    const nowSec = Math.floor(Date.now() / 1000);
    if (setIat) claims.iat = nowSec;
    if (expiresIn.trim()) {
      const parts = parseDurationParts(expiresIn);
      if (!parts) throw Object.assign(new Error("Use a duration like 15m, 1h or 7 days"), { field: "expiresIn" });
      claims.exp = Math.floor(applyDuration(new Date(nowSec * 1000), parts, 1).getTime() / 1000);
    }
    return JSON.stringify(claims);
  }

  async function submit() {
    try {
      const headerJson = header.trim() ? tryParseJson(header) : {};
      if (!isPlainObject(headerJson)) {
        throw Object.assign(new Error("Header must be a JSON object"), { field: "header" });
      }
      const token = await signToken({ alg, header: headerJson, payload: buildPayload(), key, encoding });
      await Clipboard.copy(token);
      await showToast({ style: Toast.Style.Success, title: `${MODE_LABEL[mode]} signed and copied` });
      push(<TokenDetail token={token} mode={mode} />);
    } catch (error) {
      const field = (error as { field?: keyof typeof errors }).field ?? "key";
      setErrors({ [field]: errorMessage(error) });
      await showToast({ style: Toast.Style.Failure, title: "Signing failed", message: errorMessage(error) });
    }
  }

  function generate() {
    const result = generateKey(alg, "sign");
    setKey(result.key);
    setEncoding(result.encoding);
    setGenerated(result);
    setErrors({});
    showToast({ style: Toast.Style.Success, title: result.companion ? "Generated key pair" : "Generated secret" });
  }

  const clearError = (field: keyof typeof errors) => setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <Form
      navigationTitle={`Sign ${MODE_LABEL[mode]}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign and Copy" icon={Icon.Pencil} onSubmit={submit} />
          <Action
            title="Generate Key"
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
            onAction={generate}
          />
          <CopyCompanionAction companion={generated?.companion} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="alg"
        title="Algorithm"
        value={alg}
        onChange={(v) => {
          setAlg(v);
          setGenerated(undefined);
        }}
      >
        {JWS_ALGORITHMS.map((a) => (
          <Form.Dropdown.Item key={a} value={a} title={a} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="header"
        title="Header"
        placeholder='{ "typ": "JWT", "kid": "my-key" }'
        info={`Extra protected header parameters; "alg" is set from the dropdown`}
        value={header}
        error={errors.header}
        onChange={(v) => {
          setHeader(v);
          clearError("header");
        }}
      />
      <Form.TextArea
        id="payload"
        title="Payload"
        placeholder={mode === "jwt" ? '{ "sub": "1234567890" }' : "Payload text"}
        info={mode === "jwt" ? "JSON claims set" : "Any text"}
        value={payload}
        error={errors.payload}
        onChange={(v) => {
          setPayload(v);
          clearError("payload");
        }}
      />
      {mode === "jwt" && (
        <>
          <Form.Checkbox id="setIat" label='Set "iat" to now' value={setIat} onChange={setSetIat} />
          <Form.TextField
            id="expiresIn"
            title="Expires In"
            placeholder="e.g. 15m, 1h, 7 days (sets exp)"
            value={expiresIn}
            error={errors.expiresIn}
            onChange={(v) => {
              setExpiresIn(v);
              clearError("expiresIn");
            }}
          />
        </>
      )}
      <Form.Separator />
      <Form.TextArea
        id="key"
        title={isHmac ? "Secret" : "Private Key"}
        placeholder={isHmac ? "Shared secret (⌘G to generate)" : "Private key (PEM) or private JWK (⌘G to generate)"}
        value={key}
        error={errors.key}
        onChange={(v) => {
          setKey(v);
          clearError("key");
        }}
      />
      {isRawSecret(key) && <SecretEncodingDropdown value={encoding} onChange={setEncoding} />}
      <CompanionKey companion={generated?.companion} />
    </Form>
  );
}
