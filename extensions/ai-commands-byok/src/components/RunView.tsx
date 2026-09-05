import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  Keyboard,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { resolveModel, runCommand, tidy } from "../lib/ai";
import { boldChanges, wordChanges } from "../lib/diff";
import { readInput, type Input, type InputSource } from "../lib/input";
import { PROVIDER_LABEL, type AICommand, type ExtensionPrefs } from "../lib/types";
import { CommandForm } from "./CommandForm";
import { iconFor } from "./icons";

interface Props {
  command: AICommand;
}

/**
 * Runs one command on the selected text.
 * - preview: streams into a Detail; Enter pastes over the selection.
 * - paste:   closes Raycast and pastes as soon as the model is done.
 * - copy:    copies and shows a HUD.
 */
export function RunView({ command }: Props) {
  const { push } = useNavigation();
  const [original, setOriginal] = useState("");
  const [source, setSource] = useState<InputSource | null>(null);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [highlight, setHighlight] = useState(getPreferenceValues<ExtensionPrefs>().highlightChanges !== false);
  // Kept across "Run Again": once Raycast has focus the selection is gone, so re-reading it would fail.
  const inputRef = useRef<Input | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult("");

    (async () => {
      let notice: Toast | undefined;
      try {
        const input = inputRef.current ?? (await readInput());
        if (cancelled) return;
        inputRef.current = input;
        setOriginal(input.text);
        setSource(input.source);
        // Clipboard text is a guess at what the user meant. Never paste it anywhere unseen.
        const mode = input.source === "clipboard" && command.mode === "paste" ? "preview" : command.mode;
        if (input.source === "clipboard" && inputRef.current === input) {
          notice = await showToast({
            style: Toast.Style.Failure,
            title: "No selection, using clipboard",
            message: input.reason,
          });
        }

        let acc = "";
        for await (const chunk of runCommand(command, input.text)) {
          if (cancelled) return;
          acc += chunk;
          if (mode === "preview") setResult(acc);
        }
        const final = tidy(acc, input.text);
        setResult(final);

        if (mode === "paste") {
          await closeMainWindow({ clearRootSearch: true });
          await Clipboard.paste(final);
          await popToRoot();
        } else if (mode === "copy") {
          await Clipboard.copy(final);
          await showHUD("Copied to clipboard");
          await popToRoot();
        }
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        await notice?.hide();
        await showToast({ style: Toast.Style.Failure, title: command.title, message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const model = resolveModel(command);
  const marked = highlight && !loading && result ? wordChanges(original, result) : null;
  const showBold = marked !== null && marked.changes > 0 && !marked.rewritten;
  const markdown = error
    ? `## Something went wrong\n\n${error}`
    : showBold
      ? boldChanges(marked.parts)
      : result || (loading ? `_${command.title}…_` : "_Nothing came back._");

  return (
    <Detail
      navigationTitle={command.title}
      isLoading={loading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command" text={command.title} icon={iconFor(command.icon)} />
          <Detail.Metadata.Label title="Model" text={`${PROVIDER_LABEL[command.provider]} · ${model}`} />
          {source && (
            <Detail.Metadata.TagList title="Input">
              <Detail.Metadata.TagList.Item
                text={source === "selection" ? "Selected text" : "Clipboard"}
                color={source === "selection" ? "#4FA3F8" : "#FFB86C"}
              />
            </Detail.Metadata.TagList>
          )}
          {original && <Detail.Metadata.Label title="Length" text={`${original.length} → ${result.length} chars`} />}
          {marked && (
            <Detail.Metadata.Label
              title="Changes"
              text={
                marked.changes === 0
                  ? "None, text kept as is"
                  : marked.rewritten
                    ? "Mostly new text, not highlighted"
                    : `${marked.changes} word${marked.changes === 1 ? "" : "s"}`
              }
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!loading && result && (
            <ActionPanel.Section>
              <Action.Paste title="Replace Selection" icon={Icon.Replace} content={result} />
              <Action.CopyToClipboard title="Copy Result" content={result} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            {!loading && result && (
              <Action
                title={highlight ? "Hide Changes" : "Highlight Changes"}
                icon={highlight ? Icon.EyeDisabled : Icon.Highlight}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={() => setHighlight((v) => !v)}
              />
            )}
            <Action
              title="Run Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => setAttempt((n) => n + 1)}
            />
            {original && (
              <Action.CopyToClipboard
                title="Copy Original Text"
                content={original}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
              />
            )}
            <Action
              title="Edit Command"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() => push(<CommandForm command={command} />)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
