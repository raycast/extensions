import { useEffect, useState } from "react";
import { Form, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { smartDecode, detectUrlEncoded, detectAnyText } from "./lib/pure";
import { usePrefill } from "./lib/prefill";
import { RadioGroup, type RadioOption } from "./lib/radio";

type Mode = "encodeComponent" | "encodeURI" | "decode" | "smartDecode";

const MODES = [
  { value: "encodeComponent", label: "encodeURIComponent (most used)" },
  { value: "encodeURI", label: "encodeURI (keeps ://?&# structure)" },
  { value: "decode", label: "decodeURIComponent (single pass)" },
  { value: "smartDecode", label: "Smart decode (loops, up to 5 rounds)" },
] satisfies RadioOption<Mode>[];

export default function Command() {
  const prefill = usePrefill(detectUrlEncoded);
  const anyPrefill = usePrefill(detectAnyText); // plain-text fallback prefill (keep encode mode)
  const [mode, setMode] = useState<Mode>("encodeComponent");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  // 预填注入：一次性写入Input state（与 json-format/timestamp 同款，已验证可靠）。
  // 智能Mode：解码有变化（含 %XX）→ 单次解码；解码无效果（纯 URL/普通文本）→ 保持默认编码。
  useEffect(() => {
    const p = prefill ?? anyPrefill;
    if (p && !input) {
      setInput(p);
      let m: Mode = mode;
      try {
        if (decodeURIComponent(p) !== p) m = "decode";
      } catch {
        /* 非法序列：保持编码 */
      }
      if (m !== mode) setMode(m);
      apply(m, p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, anyPrefill]);

  const apply = (m: Mode, text: string) => {
    if (!text) {
      setResult("");
      return;
    }
    try {
      if (m === "encodeComponent") setResult(encodeURIComponent(text));
      else if (m === "encodeURI") setResult(encodeURI(text));
      else if (m === "decode") setResult(decodeURIComponent(text));
      else {
        const r = smartDecode(text);
        setResult(r.text);
        if (r.rounds > 1) showToast(Toast.Style.Success, `Decoded ${r.rounds}  rounds`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult("");
      showToast(Toast.Style.Failure, "Decode failed", msg);
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
              const reverse: Mode =
                mode === "encodeComponent" ? "decode" : mode === "encodeURI" ? "smartDecode" : "encodeComponent";
              setMode(reverse);
              apply(reverse, result);
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
      <RadioGroup id="url-mode" title="Mode" value={mode} options={MODES} onChange={(v) => { setMode(v); apply(v, input); }} />

      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Text to encode / decode"
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
