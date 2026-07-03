import { Action, ActionPanel, Form, getPreferenceValues, Icon, open, showToast, Toast } from "@raycast/api";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { useRef, useState } from "react";
import {
  type AesOptions,
  type CipherMode,
  type Encoding,
  type KeyAlgorithm,
  type KeyLength,
  decryptBytes,
  decryptText,
  encryptBytes,
  encryptText,
} from "./lib/aes";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Command() {
  // Preferences seed the initial cipher parameters; the form still lets the user
  // override them per session.
  const prefs = getPreferenceValues<Preferences.AesEnDecryptor>();
  const [text, setText] = useState("");
  const [encrypted, setEncrypted] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<CipherMode>(prefs.defaultMode);
  const [encoding, setEncoding] = useState<Encoding>(prefs.defaultEncoding);
  const [keyLength, setKeyLength] = useState<KeyLength>(Number(prefs.defaultKeyLength) as KeyLength);
  const [algorithm, setAlgorithm] = useState<KeyAlgorithm>(prefs.defaultAlgorithm);
  const [decryptError, setDecryptError] = useState<string | undefined>();
  const [files, setFiles] = useState<string[]>([]);
  // Which field the user last edited, so parameter changes recompute in that
  // direction instead of always re-encrypting (which would wipe ciphertext that
  // hasn't decrypted yet, e.g. while the password is still being corrected).
  const [lastEdited, setLastEdited] = useState<"text" | "encrypted">("text");

  // Refs mirror the live value of each field so onChange can tell a genuine user
  // edit from an "echo": Raycast re-fires onChange when a field is focused/blurred
  // (e.g. tabbing past it) or when we set its value programmatically. Those echoes
  // carry an unchanged value, so we ignore them and only flip `lastEdited` on a
  // real edit. Reading from refs (not state) keeps the comparison race-free.
  const textRef = useRef("");
  const encryptedRef = useRef("");

  function commitText(value: string) {
    textRef.current = value;
    setText(value);
  }

  function commitEncrypted(value: string) {
    encryptedRef.current = value;
    setEncrypted(value);
  }

  const options: AesOptions = { mode, encoding, keyLength, algorithm };

  // `text` and `encrypted` mirror each other: editing Text (or any crypto parameter
  // while in encrypt mode) re-encrypts into `encrypted`, while editing Encrypted
  // decrypts back into `text`.
  function applyEncrypt(source: string, pwd: string, opts: AesOptions) {
    setDecryptError(undefined);
    if (!source) {
      commitEncrypted("");
      return;
    }
    try {
      commitEncrypted(encryptText(source, pwd, opts));
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Encryption failed", message: messageOf(error) });
    }
  }

  function applyDecrypt(cipher: string, pwd: string, opts: AesOptions) {
    if (!cipher) {
      commitText("");
      setDecryptError(undefined);
      return;
    }
    try {
      commitText(decryptText(cipher, pwd, opts));
      setDecryptError(undefined);
    } catch (error) {
      setDecryptError(messageOf(error));
    }
  }

  // Re-run the active direction after a parameter (password/encoding/key) change.
  function recompute(pwd: string, opts: AesOptions) {
    if (lastEdited === "encrypted") {
      applyDecrypt(encryptedRef.current, pwd, opts);
    } else {
      applyEncrypt(textRef.current, pwd, opts);
    }
  }

  async function processFile(direction: "encrypt" | "decrypt") {
    const path = files[0];
    if (!path) {
      await showToast({ style: Toast.Style.Failure, title: "Select a file first" });
      return;
    }
    try {
      const input = readFileSync(path);
      if (direction === "encrypt") {
        const outPath = `${path}.aes`;
        writeFileSync(outPath, encryptBytes(input, password, options));
        await showToast({ style: Toast.Style.Success, title: "Encrypted file saved", message: basename(outPath) });
        await open(dirname(outPath));
      } else {
        const outPath = `${path.replace(/\.aes$/, "")}.decrypted`;
        writeFileSync(outPath, decryptBytes(input, password, options));
        await showToast({ style: Toast.Style.Success, title: "Decrypted file saved", message: basename(outPath) });
        await open(dirname(outPath));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: direction === "encrypt" ? "Could not encrypt file" : "Could not decrypt file",
        message: messageOf(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Encrypted" icon={Icon.Lock} content={encrypted} />
            <Action.CopyToClipboard title="Copy Text" icon={Icon.LockUnlocked} content={text} />
          </ActionPanel.Section>
          <ActionPanel.Section title="File">
            <Action
              title="Encrypt File"
              icon={Icon.Lock}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() => processFile("encrypt")}
            />
            <Action
              title="Decrypt File"
              icon={Icon.LockUnlocked}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => processFile("decrypt")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Encrypt and decrypt text with AES. Type in Text to encrypt, or paste into Encrypted to decrypt." />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Plain text to encrypt"
        value={text}
        onChange={(value) => {
          if (value === textRef.current) return; // ignore focus/blur/programmatic echoes
          commitText(value);
          setLastEdited("text");
          applyEncrypt(value, password, options);
        }}
      />
      <Form.TextArea
        id="encrypted"
        title="Encrypted"
        placeholder="Encrypted payload to decrypt"
        value={encrypted}
        error={decryptError}
        onChange={(value) => {
          if (value === encryptedRef.current) return; // ignore focus/blur/programmatic echoes
          commitEncrypted(value);
          setLastEdited("encrypted");
          applyDecrypt(value, password, options);
        }}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Used to derive the key"
        value={password}
        onChange={(value) => {
          setPassword(value);
          recompute(value, options);
        }}
      />
      <Form.Dropdown
        id="mode"
        title="Cipher Mode"
        info="CTR matches the legacy tool (16-byte IV, no integrity check). GCM is authenticated (12-byte IV + tag) and fails loudly on a wrong password. The two are not interoperable."
        value={mode}
        onChange={(value) => {
          const next = value as CipherMode;
          setMode(next);
          recompute(password, { ...options, mode: next });
        }}
      >
        <Form.Dropdown.Item value="gcm" title="GCM (authenticated)" />
        <Form.Dropdown.Item value="ctr" title="CTR (legacy)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="encoding"
        title="Encoding"
        value={encoding}
        onChange={(value) => {
          const next = value as Encoding;
          setEncoding(next);
          recompute(password, { ...options, encoding: next });
        }}
      >
        <Form.Dropdown.Item value="base64" title="Base 64" />
        <Form.Dropdown.Item value="hex" title="Hex" />
      </Form.Dropdown>
      <Form.Dropdown
        id="keyLength"
        title="Key Length"
        value={String(keyLength)}
        onChange={(value) => {
          const next = Number(value) as KeyLength;
          setKeyLength(next);
          recompute(password, { ...options, keyLength: next });
        }}
      >
        <Form.Dropdown.Item value="128" title="128" />
        <Form.Dropdown.Item value="192" title="192" />
        <Form.Dropdown.Item value="256" title="256" />
      </Form.Dropdown>
      <Form.Dropdown
        id="algorithm"
        title="Key Algorithm"
        value={algorithm}
        onChange={(value) => {
          const next = value as KeyAlgorithm;
          setAlgorithm(next);
          recompute(password, { ...options, algorithm: next });
        }}
      >
        <Form.Dropdown.Item value="sha256" title="SHA-256" />
        <Form.Dropdown.Item value="sha512" title="SHA-512" />
        <Form.Dropdown.Item value="sha1" title="SHA-1" />
        <Form.Dropdown.Item value="md5" title="MD5" />
      </Form.Dropdown>
      <Form.FilePicker
        id="file"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
    </Form>
  );
}
