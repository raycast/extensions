import { Action, ActionPanel, Form, Icon, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { openSetupOnFirstRun } from "./lib/onboarding";
import { FixMode } from "./lib/convert";
import { cleanupOptions, languageName, runFix } from "./lib/engine";
import { cleanUpPersian } from "./lib/persian";
import { replaceWords } from "./lib/spelling";
import { useEngine } from "./lib/use-engine";

export default function Command() {
  const engine = useEngine();
  useEffect(() => {
    openSetupOnFirstRun();
  }, []);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<FixMode>();
  const [spelling, setSpelling] = useState(false);
  const [cleanup, setCleanup] = useState(false);

  const result = useMemo(() => {
    if (!engine || !input) return undefined;
    const fixed = runFix(engine, input, { explicit: true, mode: mode ?? engine.prefs.mode });
    let text = fixed.text;
    const misspelled = engine.speller.check(text);
    if (spelling) {
      text = replaceWords(
        text,
        new Map(misspelled.filter((m) => m.suggestions.length).map((m) => [m.index, m.suggestions[0]])),
      );
    }
    if (cleanup) text = cleanUpPersian(text, cleanupOptions(engine.prefs), engine.dicts);
    return { text, target: fixed.target, misspelled };
  }, [engine, input, mode, spelling, cleanup]);

  const output = result?.text ?? "";
  const changed = !!input && output !== input;

  return (
    <Form
      isLoading={!engine}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Fixed Text" content={output} />
          <Action.CopyToClipboard title="Copy Fixed Text" content={output} />
          <Action
            title={spelling ? "Stop Correcting Spelling" : "Correct Spelling Too"}
            icon={Icon.Text}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => setSpelling(!spelling)}
          />
          <Action
            title={cleanup ? "Stop Cleaning up Persian" : "Clean up Persian Too"}
            icon={Icon.Wand}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => setCleanup(!cleanup)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="Text" placeholder="صشدف فخ لقشذ معدزا فخیشغ" value={input} onChange={setInput} />
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={mode ?? engine?.prefs.mode ?? "smart"}
        onChange={(value) => setMode(value as FixMode)}
      >
        <Form.Dropdown.Item value="smart" title="Smart" />
        <Form.Dropdown.Item value="all" title="Convert Everything" />
      </Form.Dropdown>
      <Form.Checkbox id="spelling" label="Correct spelling" value={spelling} onChange={setSpelling} />
      <Form.Checkbox id="cleanup" label="Clean up Persian" value={cleanup} onChange={setCleanup} />
      <Form.Separator />
      <Form.Description
        title={result?.target ? languageName(result.target) : "Result"}
        text={input ? (changed ? output : "Nothing to fix") : ""}
      />
      {result && result.misspelled.length > 0 && !spelling ? (
        <Form.Description
          title="Spelling"
          text={result.misspelled
            .map((m) => (m.suggestions.length ? `${m.word} → ${m.suggestions.slice(0, 3).join(", ")}` : m.word))
            .join("\n")}
        />
      ) : null}
    </Form>
  );
}
