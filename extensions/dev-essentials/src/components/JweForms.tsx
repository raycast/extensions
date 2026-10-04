import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { errorMessage } from "../lib/errors";
import {
  decodeToken,
  decryptToken,
  encryptToken,
  GeneratedKey,
  generateKey,
  JWE_CONTENT_ENCRYPTIONS,
  JWE_KEY_ALGORITHMS,
  SecretEncoding,
} from "../lib/tokens";
import { CompanionKey, CopyCompanionAction, isRawSecret, SecretEncodingDropdown } from "./KeyFields";
import { DecryptedDetail, TokenDetail } from "./TokenDetail";

function isSymmetricAlg(alg: string): boolean {
  return alg === "dir" || /^A\d+(GCM)?KW$/.test(alg) || alg.startsWith("PBES2");
}

export function DecryptForm({ token: initialToken }: { token?: string }) {
  const { push } = useNavigation();
  const [token, setToken] = useState(initialToken ?? "");
  const [key, setKey] = useState("");
  const [encoding, setEncoding] = useState<SecretEncoding>("utf8");
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const header = useMemo(() => {
    try {
      return decodeToken(token).header;
    } catch {
      return undefined;
    }
  }, [token]);
  const symmetric = header?.alg ? isSymmetricAlg(String(header.alg)) : true;

  async function submit() {
    setIsLoading(true);
    try {
      const outcome = await decryptToken(token, key, encoding);
      push(<DecryptedDetail outcome={outcome} />);
    } catch (e) {
      setError(errorMessage(e));
      await showToast({ style: Toast.Style.Failure, title: "Decryption failed", message: errorMessage(e) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Decrypt JWE"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decrypt" icon={Icon.LockUnlocked} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="token"
        title="Token"
        placeholder="eyJhbGciOi… (5 parts)"
        value={token}
        onChange={(v) => {
          setToken(v);
          setError(undefined);
        }}
      />
      <Form.Description
        title="Algorithm"
        text={header ? `alg: ${String(header.alg)}   enc: ${String(header.enc)}` : "—"}
      />
      <Form.TextArea
        id="key"
        title={symmetric ? "Secret" : "Private Key"}
        placeholder={
          symmetric
            ? "Shared key or password (PBES2), or symmetric JWK"
            : "Private key (PEM), private JWK, or JWKS with private keys"
        }
        value={key}
        error={error}
        onChange={(v) => {
          setKey(v);
          setError(undefined);
        }}
      />
      {isRawSecret(key) && <SecretEncodingDropdown value={encoding} onChange={setEncoding} />}
    </Form>
  );
}

export function EncryptForm({ initialPlaintext }: { initialPlaintext?: string }) {
  const { push } = useNavigation();
  const [alg, setAlg] = useState<string>("dir");
  const [enc, setEnc] = useState<string>("A256GCM");
  const [plaintext, setPlaintext] = useState(initialPlaintext ?? "");
  const [cty, setCty] = useState("");
  const [key, setKey] = useState("");
  const [encoding, setEncoding] = useState<SecretEncoding>("utf8");
  const [generated, setGenerated] = useState<GeneratedKey>();
  const [error, setError] = useState<string>();
  const symmetric = isSymmetricAlg(alg);

  async function submit() {
    try {
      const token = await encryptToken({
        alg,
        enc,
        header: cty.trim() ? { cty: cty.trim() } : {},
        plaintext,
        key,
        encoding,
      });
      await Clipboard.copy(token);
      await showToast({ style: Toast.Style.Success, title: "JWE created and copied" });
      push(<TokenDetail token={token} mode="jwe" />);
    } catch (e) {
      setError(errorMessage(e));
      await showToast({ style: Toast.Style.Failure, title: "Encryption failed", message: errorMessage(e) });
    }
  }

  function generate() {
    const result = generateKey(alg, "encrypt", enc);
    setKey(result.key);
    setEncoding(result.encoding);
    setGenerated(result);
    setError(undefined);
    showToast({ style: Toast.Style.Success, title: result.companion ? "Generated key pair" : "Generated key" });
  }

  const resetGenerated = () => {
    setGenerated(undefined);
    setError(undefined);
  };

  return (
    <Form
      navigationTitle="Encrypt JWE"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encrypt and Copy" icon={Icon.Lock} onSubmit={submit} />
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
        title="Key Management (alg)"
        value={alg}
        onChange={(v) => {
          setAlg(v);
          resetGenerated();
        }}
      >
        {JWE_KEY_ALGORITHMS.map((a) => (
          <Form.Dropdown.Item key={a} value={a} title={a} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="enc"
        title="Content Encryption (enc)"
        value={enc}
        onChange={(v) => {
          setEnc(v);
          if (alg === "dir") resetGenerated();
        }}
      >
        {JWE_CONTENT_ENCRYPTIONS.map((e) => (
          <Form.Dropdown.Item key={e} value={e} title={e} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="plaintext"
        title="Plaintext"
        placeholder="Any text, JSON, or a signed JWT (set Content Type to JWT)"
        value={plaintext}
        onChange={setPlaintext}
      />
      <Form.TextField
        id="cty"
        title="Content Type (cty)"
        placeholder="Optional, e.g. JWT"
        value={cty}
        onChange={setCty}
      />
      <Form.Separator />
      <Form.TextArea
        id="key"
        title={symmetric ? "Secret" : "Public Key"}
        placeholder={
          symmetric
            ? alg.startsWith("PBES2")
              ? "Password (⌘G to generate)"
              : "Shared key (⌘G to generate)"
            : "Recipient public key (PEM / JWK) (⌘G to generate)"
        }
        value={key}
        error={error}
        onChange={(v) => {
          setKey(v);
          setError(undefined);
        }}
      />
      {isRawSecret(key) && <SecretEncodingDropdown value={encoding} onChange={setEncoding} />}
      <CompanionKey companion={generated?.companion} />
    </Form>
  );
}
