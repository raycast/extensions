import { Alert, confirmAlert, showToast, Toast, useNavigation } from "@raycast/api";
import { CommandOutput } from "../components/command-output";
import { CommandError, runGt, summarizeOutput } from "../lib/cli";
import { Repository } from "../lib/repositories";

export type GtCommand = {
  /** Arguments passed to `gt`, e.g. `["restack", "--branch", "feature"]`. */
  args: string[];
  /** Present-tense label for the progress toast, e.g. "Restacking". */
  progress: string;
  /** Toast title when the command succeeds. */
  success: string;
  /** Optional failure toast title for the specific command. */
  failure?: string;
  /** Ask before running. Use for anything that pushes to GitHub or rewrites branches. */
  confirm?: { title: string; message: string; button: string; destructive?: boolean };
};

/**
 * Runs `gt` commands in a repository with consistent feedback: a progress toast, a short summary of the CLI's
 * output, and a "Show Output" action that opens everything the CLI printed.
 */
export function useGt(onFinished: () => void) {
  const { push } = useNavigation();

  return async function run(repository: Repository, command: GtCommand): Promise<boolean> {
    const commandLine = `gt ${command.args.join(" ")}`;

    if (command.confirm) {
      const confirmed = await confirmAlert({
        title: command.confirm.title,
        message: `${command.confirm.message}\n\nRuns \`${commandLine}\` in ${repository.name}.`,
        primaryAction: {
          title: command.confirm.button,
          style: command.confirm.destructive ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) return false;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: `${command.progress}…` });
    const showOutput = (output: string, failed: boolean) => ({
      title: "Show Output",
      onAction: () => push(<CommandOutput command={commandLine} output={output} failed={failed} />),
    });

    try {
      const { stdout, stderr } = await runGt(command.args, repository.path);
      const output = [stdout, stderr].filter((part) => part.trim()).join("\n");
      toast.style = Toast.Style.Success;
      toast.title = command.success;
      toast.message = summarizeOutput(output, 2);
      toast.primaryAction = showOutput(output, false);
      return true;
    } catch (error) {
      const output = error instanceof CommandError ? error.output : String(error);
      toast.style = Toast.Style.Failure;
      toast.title = command.failure ?? `${command.progress} failed`;
      toast.message = error instanceof CommandError ? summarizeOutput(error.message, 3) : String(error);
      toast.primaryAction = showOutput(output, true);
      return false;
    } finally {
      onFinished();
    }
  };
}
