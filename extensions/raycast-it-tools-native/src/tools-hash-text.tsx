import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { createHash } from "crypto";
import { useMemo, useState } from "react";

type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha512";
type LetterCase = "lowercase" | "uppercase";

export function ToolsHashTextView() {
  const [text, setText] = useState("");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("sha256");
  const [letterCase, setLetterCase] = useState<LetterCase>("lowercase");

  const hash = useMemo(() => {
    if (!text) return "";
    const digest = createHash(algorithm).update(text, "utf8").digest("hex");
    return letterCase === "uppercase" ? digest.toUpperCase() : digest;
  }, [algorithm, letterCase, text]);

  const charCount = text.length;
  const byteCount = Buffer.byteLength(text, "utf8");

  async function pasteFromClipboard() {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Clipboard is empty",
      });
      return;
    }
    setText(clipboardText);
  }

  async function handleCopy() {
    if (!hash) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter text to hash",
      });
      return;
    }
    await Clipboard.copy(hash);
    await showToast({
      style: Toast.Style.Success,
      title: `${algorithm.toUpperCase()} copied`,
    });
  }

  return (
    <Form
      navigationTitle="Tools: Hash Text"
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Output">
            <Action
              title="Copy Hash"
              icon={Icon.Clipboard}
              onAction={handleCopy}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Input">
            <Action
              title="Paste from Clipboard"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={pasteFromClipboard}
            />
            <Action
              title="Clear Input"
              icon={Icon.XmarkCircle}
              onAction={() => setText("")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Input plain text..."
        value={text}
        onChange={setText}
      />
      <Form.Dropdown
        id="algorithm"
        title="Algorithm"
        value={algorithm}
        onChange={(value) => setAlgorithm(value as HashAlgorithm)}
      >
        <Form.Dropdown.Item value="sha256" title="SHA-256 (Recommended)" />
        <Form.Dropdown.Item value="sha512" title="SHA-512" />
        <Form.Dropdown.Item value="sha1" title="SHA-1" />
        <Form.Dropdown.Item value="md5" title="MD5" />
      </Form.Dropdown>
      <Form.Dropdown
        id="letterCase"
        title="Output Case"
        value={letterCase}
        onChange={(value) => setLetterCase(value as LetterCase)}
      >
        <Form.Dropdown.Item value="lowercase" title="Lowercase" />
        <Form.Dropdown.Item value="uppercase" title="Uppercase" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Input Stats"
        text={`Characters: ${charCount} | Bytes: ${byteCount}`}
      />
      <Form.Description
        title="Digest Length"
        text={hash ? `${hash.length} chars` : "-"}
      />
      <Form.Description
        title="Digest"
        text={hash || "Hash output appears here"}
      />
    </Form>
  );
}

export default ToolsHashTextView;
