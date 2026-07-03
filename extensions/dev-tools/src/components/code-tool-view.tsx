// Shared view behind every formatter/minifier command. One component, fixed to a
// (operation, language) pair by a thin command wrapper. It prefills from the
// clipboard, recomputes the output live as you type or change a setting, and
// remembers the settings per command via LocalStorage.
//
// Unlike the synchronous text-encoder form, formatting/minifying is async, so a
// monotonic request id (`seqRef`) guards every result: a slow run for stale input
// can never overwrite a newer one. Keystrokes are debounced; a parse error keeps
// the last good output and shows the message inline.

import { Action, ActionPanel, Clipboard, Form, Icon } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { Language, Operation } from "../lib/languages";
import { LANGUAGES } from "../lib/languages";
import { DEFAULT_FORMAT_OPTIONS, FORMAT_FIELDS } from "../lib/format-options";
import { DEFAULT_MINIFY_OPTIONS, MINIFY_FIELDS } from "../lib/minify-options";
import { loadSettings, saveSettings, settingsKey } from "../lib/settings-store";

// The actual format/minify work is injected so that this UI module never imports
// the heavy formatter or minifier libraries — each command bundles only the one
// it needs (see format-view.tsx / minify-view.tsx).
export type OptionValues = Record<string, string | number | boolean>;
export type Transform = (code: string, options: OptionValues) => Promise<string>;
type DropdownOption = { value: string; title: string };
type FieldSpec =
  | { kind: "dropdown"; title: string; info?: string; numeric?: boolean; options: DropdownOption[] }
  | { kind: "checkbox"; title: string; label: string; info?: string };

const SQL_DIALECTS: DropdownOption[] = [
  { value: "sql", title: "Standard SQL" },
  { value: "postgresql", title: "PostgreSQL" },
  { value: "mysql", title: "MySQL" },
  { value: "mariadb", title: "MariaDB" },
  { value: "sqlite", title: "SQLite" },
  { value: "bigquery", title: "BigQuery" },
  { value: "tsql", title: "Transact-SQL" },
  { value: "plsql", title: "PL/SQL" },
  { value: "redshift", title: "Redshift" },
  { value: "spark", title: "Spark SQL" },
  { value: "snowflake", title: "Snowflake" },
];

// How each option key renders. Keys match FormatOptions/MinifyOptions fields.
const FIELD_SPECS: Record<string, FieldSpec> = {
  // Format
  indentStyle: {
    kind: "dropdown",
    title: "Indentation",
    options: [
      { value: "space", title: "Spaces" },
      { value: "tab", title: "Tabs" },
    ],
  },
  indentSize: {
    kind: "dropdown",
    title: "Indent Size",
    numeric: true,
    options: [
      { value: "2", title: "2" },
      { value: "4", title: "4" },
      { value: "8", title: "8" },
    ],
  },
  printWidth: {
    kind: "dropdown",
    title: "Print Width",
    info: "Wrap lines that exceed this many columns.",
    numeric: true,
    options: [
      { value: "80", title: "80" },
      { value: "100", title: "100" },
      { value: "120", title: "120" },
      { value: "160", title: "160" },
    ],
  },
  quotes: {
    kind: "dropdown",
    title: "Quotes",
    options: [
      { value: "double", title: "Double" },
      { value: "single", title: "Single" },
    ],
  },
  semicolons: { kind: "checkbox", title: "Semicolons", label: "Add semicolons at statement ends" },
  trailingComma: {
    kind: "dropdown",
    title: "Trailing Commas",
    options: [
      { value: "all", title: "All" },
      { value: "es5", title: "ES5" },
      { value: "none", title: "None" },
    ],
  },
  proseWrap: {
    kind: "dropdown",
    title: "Prose Wrap",
    options: [
      { value: "preserve", title: "Preserve" },
      { value: "always", title: "Always" },
      { value: "never", title: "Never" },
    ],
  },
  sqlDialect: { kind: "dropdown", title: "Dialect", options: SQL_DIALECTS },
  sqlKeywordCase: {
    kind: "dropdown",
    title: "Keyword Case",
    options: [
      { value: "upper", title: "UPPERCASE" },
      { value: "lower", title: "lowercase" },
      { value: "preserve", title: "Preserve" },
    ],
  },
  // Minify
  mangle: { kind: "checkbox", title: "Mangle Names", label: "Rename local identifiers (uglify)" },
  compress: { kind: "checkbox", title: "Compress", label: "Remove dead code and shorten expressions" },
  dropConsole: { kind: "checkbox", title: "Drop Console", label: "Remove console.* calls" },
  dropDebugger: { kind: "checkbox", title: "Drop Debugger", label: "Remove debugger statements" },
  removeComments: { kind: "checkbox", title: "Remove Comments", label: "Strip comments from the output" },
  cssLevel: {
    kind: "dropdown",
    title: "Optimization",
    numeric: true,
    options: [
      { value: "1", title: "Level 1 (safe)" },
      { value: "2", title: "Level 2 (merge rules)" },
    ],
  },
  htmlCollapseWhitespace: {
    kind: "checkbox",
    title: "Collapse Whitespace",
    label: "Collapse whitespace between elements",
  },
  htmlRemoveOptionalTags: { kind: "checkbox", title: "Remove Optional Tags", label: "Drop optional tags like </li>" },
  htmlRemoveRedundantAttributes: {
    kind: "checkbox",
    title: "Remove Redundant Attributes",
    label: "Drop default-valued attributes",
  },
  htmlMinifyInlineCss: { kind: "checkbox", title: "Minify Inline CSS", label: "Minify <style> contents" },
  htmlMinifyInlineJs: { kind: "checkbox", title: "Minify Inline JS", label: "Minify <script> contents" },
};

function cleanError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split("\n")[0].trim();
  return firstLine || "Could not process the input.";
}

export function CodeToolView({
  operation,
  language,
  transform,
}: {
  operation: Operation;
  language: Language;
  transform: Transform;
}) {
  const meta = LANGUAGES[language];
  const storageKey = settingsKey(operation, language);
  const fields = operation === "format" ? FORMAT_FIELDS[language] : MINIFY_FIELDS[language];
  const defaults: OptionValues = operation === "format" ? DEFAULT_FORMAT_OPTIONS : DEFAULT_MINIFY_OPTIONS;

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [opts, setOpts] = useState<OptionValues>(defaults);
  const [ready, setReady] = useState(false);

  // Refs hold the live values so handlers and async callbacks never read stale
  // state. `seqRef` is the async race guard; `inputRef` also filters Raycast's
  // focus/blur/programmatic onChange echoes.
  const inputRef = useRef("");
  const optsRef = useRef<OptionValues>(defaults);
  const seqRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function run(code: string, currentOpts: OptionValues) {
    const seq = ++seqRef.current;
    if (!code.trim()) {
      if (seq === seqRef.current) {
        setOutput("");
        setError(undefined);
        setIsLoading(false);
      }
      return;
    }
    setIsLoading(true);
    try {
      const result = await transform(code, currentOpts);
      if (seq !== seqRef.current) return; // a newer request superseded this one
      setOutput(result);
      setError(undefined);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setError(cleanError(e)); // keep the last good output
    } finally {
      if (seq === seqRef.current) setIsLoading(false);
    }
  }

  function scheduleRecompute(code: string, currentOpts: OptionValues) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void run(code, currentOpts), 250);
  }

  function setOpt(optKey: string, value: string | number | boolean) {
    const prev = optsRef.current;
    if (prev[optKey] === value) return; // ignore no-op echoes
    const next = { ...prev, [optKey]: value };
    optsRef.current = next;
    setOpts(next);
    if (ready) void saveSettings(storageKey, next);
    scheduleRecompute(inputRef.current, next);
  }

  useEffect(() => {
    (async () => {
      const stored = await loadSettings(storageKey, defaults);
      optsRef.current = stored;
      setOpts(stored);
      setReady(true);
      const clip = await Clipboard.readText();
      if (clip && clip.trim()) {
        inputRef.current = clip;
        setInput(clip);
        void run(clip, stored); // immediate, using freshly-loaded settings
      }
    })();
    // Mount only — storageKey/language/operation are fixed for a command.
  }, []);

  async function reloadFromClipboard() {
    const clip = (await Clipboard.readText()) ?? "";
    inputRef.current = clip;
    setInput(clip);
    await run(clip, optsRef.current);
  }

  const verb = operation === "format" ? "Format" : "Minify";
  const outputTitle = operation === "format" ? "Formatted" : "Minified";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={`Copy ${outputTitle}`} icon={Icon.Clipboard} content={output} />
          <Action.Paste title={`Paste ${outputTitle}`} icon={Icon.Text} content={output} />
          <Action
            title="Reload from Clipboard"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={reloadFromClipboard}
          />
          <Action.CopyToClipboard
            title="Copy Input"
            icon={Icon.Code}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            content={input}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`${verb} ${meta.label}. Paste or type below — the result updates live. Settings are remembered for this command.`}
      />
      <Form.TextArea
        id="input"
        title={meta.label}
        placeholder={`Paste ${meta.label} to ${operation}…`}
        value={input}
        error={error}
        autoFocus
        onChange={(value) => {
          if (value === inputRef.current) return; // ignore focus/blur/programmatic echoes
          inputRef.current = value;
          setInput(value);
          scheduleRecompute(value, optsRef.current);
        }}
      />
      <Form.TextArea id="output" title={outputTitle} value={output} />
      {fields.map((optKey) => {
        const spec = FIELD_SPECS[optKey];
        if (!spec) return null;
        const current = opts[optKey];
        if (spec.kind === "checkbox") {
          return (
            <Form.Checkbox
              key={optKey}
              id={optKey}
              title={spec.title}
              label={spec.label}
              info={spec.info}
              value={Boolean(current)}
              onChange={(value) => setOpt(optKey, value)}
            />
          );
        }
        return (
          <Form.Dropdown
            key={optKey}
            id={optKey}
            title={spec.title}
            info={spec.info}
            value={String(current)}
            onChange={(value) => setOpt(optKey, spec.numeric ? Number(value) : value)}
          >
            {spec.options.map((option) => (
              <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
            ))}
          </Form.Dropdown>
        );
      })}
    </Form>
  );
}
