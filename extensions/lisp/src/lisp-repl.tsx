// src/commands/lisp-repl.tsx

import { Form, ActionPanel, Action } from "@raycast/api";
import { useState, useRef } from "react";
import { exec } from "@jcubic/lips";

type HistoryItem = { code: string; result: string };

export default function LispReplCommand() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [code, setCode] = useState("");
  const [openPars, setOpenPars] = useState(0);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [prevValue, setPrevValue] = useState<string | null>(null);

  // We only need focus(), so we can type this loosely:
  const inputRef = useRef<{ focus(): void; reset(): void }>(null);

  async function evaluateLisp(input: string): Promise<string> {
    const results = await exec(input);
    const lines = results.filter((r) => r !== undefined).map((r) => r.toString());
    return lines.length > 0 ? lines.join("\n") : "—";
  }

  async function handleSubmit(values: { code: string }) {
    const input = values.code.trim();
    if (!input) {
      return;
    }

    try {
      const output = await evaluateLisp(input);
      setHistory((h) => [{ code: input, result: output }, ...h]);
    } catch (err) {
      setHistory((h) => [{ code: input, result: "Error: " + err.message }, ...h]);
    }

    // reset
    setCode("");
    setHistoryIndex(null);
    setTimeout(() => inputRef.current?.focus(), 0);
    setOpenPars(0);
  }

  function handleChange(value: string) {
    // track open parens for indent
    if (value.endsWith("(") && (prevValue?.length || 0) < value.length) {
      setOpenPars((p) => p + 1);
    } else if (value.endsWith(")") && (prevValue?.length || 0) < value.length) {
      setOpenPars((p) => Math.max(0, p - 1));
    }

    // simple auto-indent
    if (value.endsWith("\n") && (prevValue?.length || 0) < value.length) {
      const indent = " ".repeat(openPars * 4);
      value += indent;
    }

    setCode(value);
    setPrevValue(value);
  }

  function handlePrevious() {
    if (history.length === 0) return;

    const idx = Math.min((historyIndex === null ? -1 : historyIndex) + 1, history.length - 1);
    setHistoryIndex(idx);
    setCode(history[idx].code);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleNext() {
    if (history.length === 0 || historyIndex === null) return;

    const idx = Math.max(historyIndex - 1, 0);
    setHistoryIndex(idx);
    setCode(history[idx].code);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Evaluate" onSubmit={handleSubmit} />
          <Action
            title="Previous Command"
            onAction={handlePrevious}
            shortcut={{ key: "arrowUp", modifiers: ["cmd"] }}
          />
          <Action title="Next Command" onAction={handleNext} shortcut={{ key: "arrowDown", modifiers: ["cmd"] }} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="code"
        title="Lisp Code"
        ref={inputRef}
        value={code}
        onChange={handleChange}
        placeholder="(+ 1 2)"
        autoFocus
      />
      {history.map((entry, idx) => (
        <Form.Description key={idx} title="> " text={`${entry.code}\n${entry.result}`} />
      ))}
    </Form>
  );
}
