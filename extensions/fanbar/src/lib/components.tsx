import { Action, ActionPanel, Icon, List, Toast, open, openExtensionPreferences } from "@raycast/api";
import { showFailureToast as showUtilsFailureToast } from "@raycast/utils";
import { DEFAULT_LOCATIONS, DOCS_URL, FanBarError, INSTALL_COMMAND, asFanBarError } from "./fanbar";

export function showFailureToast(error: unknown): Promise<Toast> {
  const failure = asFanBarError(error);
  return showUtilsFailureToast(failure, { title: failure.title });
}

/** Actions that help with any failure; extra ones go first. */
export function RecoveryActions(props: { onRetry?: () => void }) {
  return (
    <>
      {props.onRetry && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} />}
      <Action title="Open FanBar" icon={Icon.AppWindow} onAction={() => open("/Applications/FanBar.app")} />
      <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} />
      <Action title="Set Fanbar Path" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Fanbar Docs" url={DOCS_URL} />
    </>
  );
}

/** Empty state for a List: install instructions when the tool is missing, the error otherwise. */
export function FailureEmptyView(props: { error: unknown; onRetry?: () => void }) {
  const failure = asFanBarError(props.error);
  return (
    <List.EmptyView
      icon={failure.failure === "missing" ? Icon.Download : Icon.Warning}
      title={failure.title}
      description={describe(failure)}
      actions={
        <ActionPanel>
          <RecoveryActions onRetry={props.onRetry} />
        </ActionPanel>
      }
    />
  );
}

export function describe(failure: FanBarError): string {
  if (failure.failure === "missing") {
    return (
      "Install the command-line tool in FanBar Settings › General › Command Line & Automation, " +
      `or set its path in this extension's preferences. Looked in ${DEFAULT_LOCATIONS.join(", ")}.`
    );
  }
  return failure.message;
}

/** Markdown version of the empty state, for Detail views. */
export function failureMarkdown(error: unknown): string {
  const failure = asFanBarError(error);
  const lines = [`# ${failure.title}`, "", describe(failure)];
  if (failure.failure === "missing") {
    lines.push("", "To link it by hand:", "", "```sh", INSTALL_COMMAND.replace(" && ", "\n"), "```");
  }
  return lines.join("\n");
}
