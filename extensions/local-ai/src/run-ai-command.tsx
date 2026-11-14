import {
  Action,
  closeMainWindow,
  Detail,
  Icon,
  List,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ArgumentForm } from "./components/ArgumentForm";
import { CommandList } from "./components/CommandList";
import { PreflightGate } from "./components/PreflightGate";
import { ResultView } from "./components/ResultView";
import { useCommands } from "./hooks/useCommands";
import type { AiCommand } from "./lib/commands/types";
import { isRunViewLaunchContext, type RunInput, type RunViewLaunchContext } from "./lib/launch-context";
import { parsePrompt } from "./lib/placeholders";
import { NO_INPUT_MESSAGE, resolveLaunchTarget } from "./lib/run-request";
import { captureInput } from "./services/input";
import { replaceSelection } from "./services/paste";

export default function Command(props: LaunchProps) {
  const context = isRunViewLaunchContext(props.launchContext) ? props.launchContext : undefined;
  const [input, setInput] = useState<RunInput | undefined>(context?.input);
  const [captured, setCaptured] = useState(context?.input !== undefined);

  useEffect(() => {
    if (captured) return;
    captureInput()
      .catch(() => undefined)
      .then((value) => {
        setInput(value);
        setCaptured(true);
      });
  }, []);

  if (!captured) return <List isLoading />;

  return (
    <PreflightGate>{context ? <DirectRun context={context} input={input} /> : <RunList input={input} />}</PreflightGate>
  );
}

function RunList(props: { input?: RunInput }) {
  return <CommandList renderRunAction={(command) => <RunCommandAction command={command} input={props.input} />} />;
}

function RunCommandAction(props: { command: AiCommand; input?: RunInput }) {
  const { command, input } = props;
  const { push } = useNavigation();

  function run() {
    if (!input) return showToast({ style: Toast.Style.Failure, title: NO_INPUT_MESSAGE });
    const specs = parsePrompt(command.prompt).arguments;
    const runWith = (argumentValues: Record<string, string>) =>
      push(<ResultView command={command} input={input} argumentValues={argumentValues} />);
    if (specs.length === 0) return runWith({});
    push(<ArgumentForm command={command} specs={specs} onSubmit={runWith} />);
  }

  return <Action title="Run Command" icon={Icon.Play} onAction={run} />;
}

function DirectRun(props: { context: RunViewLaunchContext; input?: RunInput }) {
  const { commands, isLoading } = useCommands();
  const [argumentValues, setArgumentValues] = useState<Record<string, string>>();

  if (isLoading) return <Detail isLoading />;
  const target = resolveLaunchTarget(props.context.commandId, commands);
  if (target.kind !== "found") return <Detail markdown="# Command not found\n\nThis command no longer exists." />;
  if (!props.input) return <Detail markdown={`# ${NO_INPUT_MESSAGE}`} />;

  const { command } = target;
  const input = props.input;
  const specs = parsePrompt(command.prompt).arguments;
  if (specs.length > 0 && command.output === "replace") {
    return (
      <ArgumentForm
        command={command}
        specs={specs}
        onSubmit={(values) => replaceInPreviousApp(command, input, values)}
      />
    );
  }
  if (specs.length > 0 && !argumentValues) {
    return <ArgumentForm command={command} specs={specs} onSubmit={setArgumentValues} />;
  }
  return <ResultView command={command} input={input} argumentValues={argumentValues ?? {}} />;
}

async function replaceInPreviousApp(command: AiCommand, input: RunInput, argumentValues: Record<string, string>) {
  // Popping to root immediately unloads this command and kills the run, so pop only after the paste.
  await closeMainWindow();
  await replaceSelection(command, input, argumentValues);
  await popToRoot({ clearSearchBar: true });
}
