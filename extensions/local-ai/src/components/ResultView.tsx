import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useState } from "react";
import { useFmStream } from "../hooks/useFmStream";
import type { AiCommand } from "../lib/commands/types";
import type { RunInput } from "../lib/launch-context";
import { errorBlockMarkdown, explainFmError } from "../lib/fm/explain";
import { finalizeWindowText } from "../lib/output";
import { missingArguments, parsePrompt } from "../lib/placeholders";
import { isSetupError } from "../services/errors";
import { executeRun } from "../services/run";
import { ArgumentForm } from "./ArgumentForm";
import { CommandForm } from "./CommandForm";
import { ContinueInChatAction } from "./ContinueInChatAction";
import { FmErrorView } from "./FmErrorView";

const SOURCE_LABELS = { selection: "Selected text", clipboard: "Clipboard" } as const;

export function ResultView(props: { command: AiCommand; input: RunInput; argumentValues: Record<string, string> }) {
  const { input } = props;
  const [run, setRun] = useState({ command: props.command, argumentValues: props.argumentValues });
  const [editedCommand, setEditedCommand] = useState<AiCommand>();
  const { command, argumentValues } = run;
  const { text, isLoading, error, retry } = useFmStream(
    (signal, onText) => executeRun({ command, input, argumentValues, stream: true, signal, onText }),
    [command, input, JSON.stringify(argumentValues)],
  );

  function handleSaved(saved: AiCommand) {
    const specs = parsePrompt(saved.prompt).arguments;
    if (missingArguments(specs, argumentValues).length === 0) setRun({ command: saved, argumentValues });
    else setEditedCommand(saved);
  }

  if (editedCommand) {
    const specs = parsePrompt(editedCommand.prompt).arguments.map((spec) =>
      Object.hasOwn(argumentValues, spec.name) ? { ...spec, defaultValue: argumentValues[spec.name] } : spec,
    );
    return (
      <ArgumentForm
        command={editedCommand}
        specs={specs}
        onSubmit={(values) => {
          setRun({ command: editedCommand, argumentValues: { ...argumentValues, ...values } });
          setEditedCommand(undefined);
        }}
      />
    );
  }

  if (error && isSetupError(error)) return <FmErrorView error={error} onRetry={retry} />;

  const result = isLoading ? text : finalizeWindowText(text);
  const failure = error ? explainFmError(error) : undefined;
  const failureBlock = failure ? errorBlockMarkdown(failure.title, failure.explanation) : undefined;
  const markdown = failureBlock ? (result ? `${result}\n\n${failureBlock}` : failureBlock) : result;
  return (
    <Detail
      navigationTitle={command.name}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Command" text={command.name} />
          <Detail.Metadata.Label title="Input" text={SOURCE_LABELS[input.source]} />
        </Detail.Metadata>
      }
      actions={
        !isLoading ? (
          <ActionPanel>
            {result && <Action.CopyToClipboard content={result} />}
            {result && <Action.Paste title="Paste to Active App" content={result} />}
            {result && !error && <ContinueInChatAction userMessage={input.text} assistantMessage={result} />}
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={retry} />
            <Action.Push
              title="Edit Command"
              icon={Icon.Pencil}
              target={<CommandForm command={command} onSaved={handleSaved} />}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
