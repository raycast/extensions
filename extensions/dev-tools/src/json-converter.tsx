import { Action, ActionPanel, Clipboard, Form, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  type ConvertOptions,
  type Format,
  type Indent,
  FORMATS,
  LABEL,
  convert,
  detectFormat,
  parseInput,
} from "./lib/formats";
import { type Declaration, type KeyQuoting, type QuoteStyle } from "./lib/js-object";

type Source = Format | "auto";

export default function Command() {
  const [input, setInput] = useState("");
  const [source, setSource] = useState<Source>("auto");
  const [target, setTarget] = useState<Format>("yaml");
  const [indent, setIndent] = useState<Indent>("2");
  const [sortKeys, setSortKeys] = useState(false);

  // JS/TS target options (only shown, and only matter, when target is "js").
  const [jsDeclaration, setJsDeclaration] = useState<Declaration>("none");
  const [jsQuotes, setJsQuotes] = useState<QuoteStyle>("double");
  const [jsQuoteKeys, setJsQuoteKeys] = useState<KeyQuoting>("as-needed");
  const [jsSemi, setJsSemi] = useState(false);
  const [jsTrailingComma, setJsTrailingComma] = useState(false);
  const [jsAsConst, setJsAsConst] = useState(false);

  // Prefill from the clipboard on open, but only when it parses into actual
  // structured data (an object/array) — a bare string or number isn't worth
  // pulling in, and YAML would happily accept any prose as a scalar. Mirrors
  // number-base-converter's guarded prefill.
  useEffect(() => {
    (async () => {
      const clipboard = (await Clipboard.readText())?.trim();
      if (!clipboard) return;
      try {
        const value = parseInput(clipboard, detectFormat(clipboard));
        if (value && typeof value === "object") setInput(clipboard);
      } catch {
        // Not convertible — leave the field empty.
      }
    })();
  }, []);

  const options: ConvertOptions = useMemo(
    () => ({
      indent,
      sortKeys,
      js: {
        declaration: jsDeclaration,
        quotes: jsQuotes,
        quoteKeys: jsQuoteKeys,
        semi: jsSemi,
        trailingComma: jsTrailingComma,
        asConst: jsAsConst,
      },
    }),
    [indent, sortKeys, jsDeclaration, jsQuotes, jsQuoteKeys, jsSemi, jsTrailingComma, jsAsConst],
  );

  const resolvedSource: Format = source === "auto" ? (input.trim() ? detectFormat(input) : "json") : source;

  const { output, error } = useMemo<{ output: string; error?: string }>(() => {
    if (!input.trim()) return { output: "" };
    try {
      return { output: convert(input, resolvedSource, target, options) };
    } catch (e) {
      return { output: "", error: e instanceof Error ? e.message : String(e) };
    }
  }, [input, resolvedSource, target, options]);

  // Swap directions: the current output becomes the new input, and From/To trade
  // places (with `auto` resolved to whatever was detected, so the swap is concrete).
  function swap() {
    if (!output) return;
    setInput(output);
    setSource(target);
    setTarget(resolvedSource);
  }

  async function pasteFromClipboard() {
    const clipboard = (await Clipboard.readText()) ?? "";
    setInput(clipboard);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Output" icon={Icon.Clipboard} content={output} />
            <Action.CopyToClipboard
              title="Copy Input"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              content={input}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Swap Direction"
              icon={Icon.Switch}
              shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              onAction={swap}
            />
            <Action
              title="Paste from Clipboard"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
              onAction={pasteFromClipboard}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text="Convert structured data between formats. Pick From/To (or let From auto-detect); paste a JS snippet to evaluate it into data." />
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Paste JSON, YAML, TOML, a JS object, XML, CSV…"
        value={input}
        onChange={setInput}
      />
      <Form.Dropdown
        id="source"
        title="From"
        value={source}
        info={source === "auto" && input.trim() ? `Detected: ${LABEL[resolvedSource]}` : undefined}
        onChange={(v) => setSource(v as Source)}
      >
        <Form.Dropdown.Item value="auto" title="Auto-detect" icon={Icon.MagnifyingGlass} />
        <Form.Dropdown.Section title="Source format">
          {FORMATS.map((f) => (
            <Form.Dropdown.Item key={f.id} value={f.id} title={f.label} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown id="target" title="To" value={target} onChange={(v) => setTarget(v as Format)}>
        {FORMATS.map((f) => (
          <Form.Dropdown.Item key={f.id} value={f.id} title={f.label} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="indent" title="Indentation" value={indent} onChange={(v) => setIndent(v as Indent)}>
        <Form.Dropdown.Item value="2" title="2 spaces" />
        <Form.Dropdown.Item value="4" title="4 spaces" />
        <Form.Dropdown.Item value="tab" title="Tab" />
        <Form.Dropdown.Item value="minified" title="Minified" />
      </Form.Dropdown>
      <Form.Checkbox
        id="sortKeys"
        title="Keys"
        label="Sort object keys alphabetically"
        value={sortKeys}
        onChange={setSortKeys}
      />

      {target === "js" && (
        <>
          <Form.Separator />
          <Form.Dropdown
            id="jsDeclaration"
            title="Declaration"
            value={jsDeclaration}
            onChange={(v) => setJsDeclaration(v as Declaration)}
          >
            <Form.Dropdown.Item value="none" title="None (bare object)" />
            <Form.Dropdown.Item value="const" title="const data = …" />
            <Form.Dropdown.Item value="let" title="let data = …" />
            <Form.Dropdown.Item value="export-default" title="export default …" />
            <Form.Dropdown.Item value="module-exports" title="module.exports = …" />
          </Form.Dropdown>
          <Form.Dropdown id="jsQuotes" title="Quotes" value={jsQuotes} onChange={(v) => setJsQuotes(v as QuoteStyle)}>
            <Form.Dropdown.Item value="double" title={`Double  "…"`} />
            <Form.Dropdown.Item value="single" title={`Single  '…'`} />
          </Form.Dropdown>
          <Form.Dropdown
            id="jsQuoteKeys"
            title="Quote Keys"
            value={jsQuoteKeys}
            onChange={(v) => setJsQuoteKeys(v as KeyQuoting)}
          >
            <Form.Dropdown.Item value="as-needed" title="When needed" />
            <Form.Dropdown.Item value="always" title="Always" />
          </Form.Dropdown>
          <Form.Checkbox
            id="jsSemi"
            title="JS Options"
            label="Trailing semicolon"
            value={jsSemi}
            onChange={setJsSemi}
          />
          <Form.Checkbox
            id="jsTrailingComma"
            label="Trailing comma"
            value={jsTrailingComma}
            onChange={setJsTrailingComma}
          />
          <Form.Checkbox
            id="jsAsConst"
            label="Append as const (TypeScript)"
            value={jsAsConst}
            onChange={setJsAsConst}
          />
        </>
      )}

      <Form.Separator />
      <Form.TextArea id="output" title="Output" value={output} error={error} onChange={() => undefined} />
    </Form>
  );
}
