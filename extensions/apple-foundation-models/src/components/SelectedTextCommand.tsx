import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { TextTask, taskTitle } from "../lib/prompts";
import { readClipboardText, readSelectedText, TextInput } from "../lib/sources";
import { runTextTask } from "../lib/text-tasks";
import { ResultView } from "./ResultView";

/** Launch context for Ask: run a text task on the clipboard text. */
export interface TextTaskContext {
  textTask?: TextTask;
}

interface SelectedTextCommandProps {
  task: TextTask;
  /** Read the clipboard only. Used by Ask, which shows the result when nothing was selected. */
  clipboardOnly?: boolean;
}

/** Shows the start of the clipboard text, so it is clear which text was used. */
export function clipboardHeader(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  const preview = line.length > 120 ? `${line.slice(0, 119)}…` : line;
  return `**From the clipboard**\n\n> ${preview}`;
}

/** Tasks whose answer replaces the original text. */
const REPLACING_TASKS: TextTask["kind"][] = ["rewrite", "proofread", "translate"];

/** Reads the selected text (or the clipboard when nothing is selected), then runs the task on it. */
export function SelectedTextCommand({ task, clipboardOnly }: SelectedTextCommandProps) {
  const [input, setInput] = useState<TextInput | null>();
  const started = useRef(false);

  useEffect(() => {
    // Read the selection only once: two reads at the same time confuse the copy that getSelectedText falls back to.
    if (started.current) return;
    started.current = true;
    (async () => {
      if (clipboardOnly) {
        setInput((await readClipboardText()) ?? null);
        return;
      }
      const selected = await readSelectedText();
      if (selected) {
        setInput(selected);
        return;
      }
      // When nothing is selected, getSelectedText tries to copy in the frontmost app, which hides the Raycast
      // window. A command cannot launch itself, so Ask (a command of this extension) shows the result instead.
      try {
        await launchCommand({
          name: "ask",
          type: LaunchType.UserInitiated,
          context: { textTask: task } satisfies TextTaskContext,
        });
      } catch {
        await showHUD("Select some text first, or turn on the Ask command to use the clipboard");
      }
    })();
  }, []);

  if (input === undefined) {
    return <Detail isLoading navigationTitle={taskTitle(task)} markdown="" />;
  }
  if (input === null) {
    const clipboardAllowed = getPreferenceValues<ExtensionPreferences>().useClipboard !== false;
    return (
      <Detail
        navigationTitle={taskTitle(task)}
        markdown={
          clipboardAllowed
            ? "## No text found\n\nSelect some text in another app, or copy it to the clipboard, then run this command again."
            : "## No text selected\n\nSelect some text in another app, then run this command again. Using the clipboard text is turned off in the extension's preferences."
        }
        actions={
          clipboardAllowed ? undefined : (
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          )
        }
      />
    );
  }
  const replacesSelection = input.origin === "selection" && REPLACING_TASKS.includes(task.kind);
  return (
    <ResultView
      navigationTitle={taskTitle(task)}
      header={input.origin === "clipboard" ? clipboardHeader(input.text) : undefined}
      pasteFirst={replacesSelection}
      pasteTitle={replacesSelection ? "Replace Selected Text" : undefined}
      task={(runOptions) => runTextTask(task, input.text, runOptions)}
    />
  );
}
