import { useEffect, useState } from "react";
import { Form, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { b64Encode, b64Decode, detectBase64, detectAnyText } from "./lib/pure";
import { usePrefill } from "./lib/prefill";
import { RadioGroup, type RadioOption } from "./lib/radio";

type Mode = "encode" | "decode";

const MODES = [
  { value: "encode", label: "Encode (Text → Base64)" },
  { value: "decode", label: "Decode (Base64 → Text)" },
] satisfies RadioOption<Mode>[];

export default function Command() {
  const prefill = usePrefill(detectBase64);
  const anyPrefill = usePrefill(detectAnyText); // plain-text fallback prefill (keep encode mode)
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  // 预填注入：一次性写入Input state（与 json-format/timestamp 同款，已验证可靠）。
  // 智能Mode：是合法 Base64（detectBase64 采纳）→ 解码Mode；普通文本（anyPrefill 回退）→ 保持编码Mode。
  useEffect(() => {
    const p = prefill ?? anyPrefill;
    if (p && !input) {
      setInput(p);
      const m: Mode = prefill ? "decode" : "encode";
      setMode(m);
      apply(m, p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, anyPrefill]);

  const effective = input;
  const effectiveMode: Mode = mode;

  const apply = (m: Mode, text: string) => {
    if (!text) {
      setResult("");
      return;
    }
    try {
      setResult(m === "encode" ? b64Encode(text) : b64Decode(text));
    } catch (e) {
      setResult("");
      showToast(Toast.Style.Failure, "Decode failed", e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={result}
            onCopy={async () => {
              await showToast(Toast.Style.Success, "Copied", result);
            }}
          />
          <Action.Paste title="Paste to Frontmost App" content={result} shortcut={{ modifiers: ["cmd"], key: "return" }} />
          <Action
            title="Swap Input & Output"
            icon={Icon.Repeat}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => {
              setInput(result);
              const reverse: Mode = effectiveMode === "encode" ? "decode" : "encode";
              setMode(reverse);
              apply(reverse, result);
            }}
          />
          <Action
            title="Convert Result to URL-safe"
            icon={Icon.Link}
            onAction={() => {
              if (result) setResult(result.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
            }}
          />
          <Action
            title="Clear"
            icon={Icon.Trash}
            shortcut={{ modifiers: ["ctrl"], key: "k" }}
            onAction={() => {
              setInput("");
              setResult("");
            }}
          />
        </ActionPanel>
      }
    >
      <RadioGroup id="b64-mode" title="Mode" value={effectiveMode} options={MODES} onChange={(v) => { setMode(v); apply(v, input); }} />

      <Form.TextArea
        id="input"
        title="Input"
        placeholder={effectiveMode === "encode" ? "Text (Unicode / Emoji supported)" : "Base64 (URL-safe & missing padding tolerated)"}
        value={input}
        onChange={(t) => {
          setInput(t);
          apply(mode, t);
        }}
        enableMarkdown={false}
      />

      <Form.Separator />

      <Form.TextArea id="result" title="Result" value={result} onChange={() => { /* read-only result */ }} enableMarkdown={false} />
    </Form>
  );
}
