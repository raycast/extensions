import { Action, ActionPanel, Detail, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { ReactNode, useEffect } from "react";
import { FmTask, useFmRun } from "../hooks/useFmRun";
import { errorMarkdown } from "../lib/errors";

interface ResultViewProps {
  navigationTitle: string;
  task: FmTask;
  /** Markdown shown above the answer, for example the question. */
  header?: string;
  /** Markdown shown below the answer, for example the image it is about. */
  footer?: string;
  /** Make pasting the answer the main action, for example to replace the selected text. */
  pasteFirst?: boolean;
  pasteTitle?: string;
  /** Extra actions for a finished answer, for example "Continue in Chat". */
  extraActions?: (answer: string) => ReactNode;
}

const SETUP_ERRORS = ["not-installed", "license", "model-unavailable"];

/** Runs a request when it opens and shows the answer as it streams in. */
export function ResultView({
  navigationTitle,
  task,
  header,
  footer,
  pasteFirst,
  pasteTitle,
  extraActions,
}: ResultViewProps) {
  const { text, isRunning, error, wasStopped, run, stop } = useFmRun();

  useEffect(() => {
    run(task);
  }, []);

  let body = text;
  if (error) body = errorMarkdown(error);
  else if (!text && isRunning) body = "_Thinking…_";
  else if (wasStopped) body = `${text}\n\n_Stopped._`;

  const markdown = [header, body, footer].filter(Boolean).join("\n\n---\n\n");
  // A stopped answer is cut off, so it is not offered for pasting over the selection.
  const isDone = !isRunning && !error && !wasStopped && text.length > 0;

  const copy = <Action.CopyToClipboard key="copy" title="Copy Answer" content={text} />;
  const paste = <Action.Paste key="paste" title={pasteTitle ?? "Paste Answer"} content={text} />;

  return (
    <Detail
      isLoading={isRunning}
      navigationTitle={navigationTitle}
      markdown={markdown}
      actions={
        <ActionPanel>
          {isRunning && (
            <Action title="Stop" icon={Icon.Stop} shortcut={{ modifiers: ["ctrl"], key: "c" }} onAction={stop} />
          )}
          {isDone && (
            <>
              {pasteFirst ? [paste, copy] : [copy, paste]}
              {extraActions?.(text)}
            </>
          )}
          {!isRunning && (
            <Action
              title="Try Again"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => run(task)}
            />
          )}
          {wasStopped && text && <Action.CopyToClipboard title="Copy Partial Answer" content={text} />}
          {error && SETUP_ERRORS.includes(error.kind) && (
            <Action
              title="Open Check Setup"
              icon={Icon.Gear}
              onAction={() => launchCommand({ name: "check-setup", type: LaunchType.UserInitiated })}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
