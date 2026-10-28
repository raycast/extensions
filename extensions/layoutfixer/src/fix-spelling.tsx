import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  popToRoot,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { checkSpelling, readSelectionOrClipboard, remember, replaceSelection, TextSource } from "./lib/engine";
import { Misspelling, replaceWords } from "./lib/spelling";
import { openSetupOnFirstRun } from "./lib/onboarding";
import { addPersonalWord } from "./lib/storage";
import { useEngine } from "./lib/use-engine";

export default function Command() {
  const engine = useEngine();
  const [source, setSource] = useState<TextSource | null>();
  const [mistakes, setMistakes] = useState<Misspelling[]>();
  /** The chosen correction per word index; null keeps the word as it is. */
  const [choices, setChoices] = useState(new Map<number, string | null>());

  useEffect(() => {
    openSetupOnFirstRun().then((opened) => {
      if (!opened) readSelectionOrClipboard().then(setSource);
    });
  }, []);

  useEffect(() => {
    if (!engine || !source) return;
    checkSpelling(engine, source.text)
      .then((found) => {
        setMistakes(found);
        setChoices(new Map(found.map((m) => [m.index, m.suggestions[0] ?? null])));
      })
      .catch((error: Error) =>
        showToast({ style: Toast.Style.Failure, title: "Spell check failed", message: error.message }),
      );
  }, [engine, source]);

  const corrected = useMemo(() => {
    if (!source) return "";
    const replacements = new Map<number, string>();
    for (const [index, choice] of choices) if (choice) replacements.set(index, choice);
    return replaceWords(source.text, replacements);
  }, [source, choices]);

  const choose = (index: number, choice: string | null) => setChoices(new Map(choices).set(index, choice));

  async function apply() {
    if (!source || !engine) return;
    if (source.from === "selection") {
      await replaceSelection(corrected, engine.prefs.restoreClipboard);
    } else {
      await Clipboard.copy(corrected);
      await showHUD("Copied corrected text");
    }
    await remember(engine, "spelling", source.text, corrected, { undoable: source.from === "selection" });
    await popToRoot();
  }

  async function addToDictionary(m: Misspelling) {
    await addPersonalWord(m.word);
    setMistakes(mistakes?.filter((x) => x.word !== m.word));
    const next = new Map(choices);
    for (const x of mistakes ?? []) if (x.word === m.word) next.delete(x.index);
    setChoices(next);
    await showToast({ style: Toast.Style.Success, title: `Added “${m.word}” to your dictionary` });
  }

  if (source === null) {
    return (
      <List>
        <List.EmptyView icon={Icon.Text} title="Select some text or copy it first" />
      </List>
    );
  }

  const preview = `${corrected}\n\n---\n\n*From the ${source?.from ?? "selection"}*`;
  const applyTitle = source?.from === "clipboard" ? "Copy Corrected Text" : "Replace Selection with Corrected Text";

  return (
    <List isLoading={!mistakes} isShowingDetail={!!mistakes?.length} navigationTitle="Check Spelling">
      {mistakes && mistakes.length === 0 ? (
        <List.EmptyView icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} title="No spelling mistakes" />
      ) : null}
      {mistakes?.map((m) => {
        const choice = choices.get(m.index);
        return (
          <List.Item
            key={m.index}
            title={m.word}
            subtitle={choice ? `→ ${choice}` : "kept"}
            icon={
              choice
                ? { source: Icon.Pencil, tintColor: Color.Orange }
                : { source: Icon.Check, tintColor: Color.SecondaryText }
            }
            accessories={[{ tag: m.lang === "fa" ? "فارسی" : "English" }]}
            detail={<List.Item.Detail markdown={preview} />}
            actions={
              <ActionPanel>
                <Action title={applyTitle} icon={Icon.CheckCircle} onAction={apply} />
                <ActionPanel.Section title={`Correct “${m.word}”`}>
                  {m.suggestions.map((s, i) => (
                    <Action
                      key={s}
                      title={`Use “${s}”`}
                      icon={s === choice ? Icon.CheckCircle : Icon.Circle}
                      shortcut={
                        i < 9 ? { modifiers: ["cmd"], key: String(i + 1) as Keyboard.KeyEquivalent } : undefined
                      }
                      onAction={() => choose(m.index, s)}
                    />
                  ))}
                  <Action
                    title="Keep as Is"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd"], key: "0" }}
                    onAction={() => choose(m.index, null)}
                  />
                  <Action
                    title="Add to Personal Dictionary"
                    icon={Icon.Book}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    onAction={() => addToDictionary(m)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Corrected Text"
                    content={corrected}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
