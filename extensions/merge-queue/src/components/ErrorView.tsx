import { Action, ActionPanel, Form, Icon, Keyboard, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { ReactElement } from "react";
import { describeError, ErrorAdvice, MERGE_QUEUE_DOCS } from "../lib/errors";
import { GhErrorKind } from "../lib/gh";
import { RepoSelection } from "../lib/repos";
import { runInTerminal } from "./terminal";

const ICONS: Record<GhErrorKind, Icon> = {
  missing: Icon.Terminal,
  unauthenticated: Icon.Lock,
  expired: Icon.Lock,
  sso: Icon.Key,
  "not-found": Icon.QuestionMarkCircle,
  gone: Icon.Hourglass,
  "no-queue": Icon.Info,
  offline: Icon.WifiDisabled,
  "rate-limited": Icon.Clock,
  forbidden: Icon.Lock,
  other: Icon.Warning,
};

export function errorIcon(advice: ErrorAdvice): Icon {
  return ICONS[advice.kind];
}

export function ErrorEmptyView(props: {
  error: unknown;
  onRetry?: () => void;
  switchAction?: ReactElement;
  branchAction?: ReactElement;
}) {
  const advice = describeError(props.error);
  return (
    <List.EmptyView
      icon={errorIcon(advice)}
      title={advice.title}
      description={advice.description}
      actions={
        <ActionPanel>
          {advice.url ? <Action.OpenInBrowser title="Authorize on GitHub" url={advice.url} /> : null}
          {advice.canSwitch ? props.switchAction : null}
          {advice.kind === "no-queue" ? props.branchAction : null}
          {advice.command && advice.kind !== "not-found" ? (
            <Action
              title={advice.kind === "missing" ? "Install GitHub CLI in Terminal" : "Open Terminal to Sign in"}
              icon={Icon.Terminal}
              onAction={() => runInTerminal(advice.command as string)}
            />
          ) : null}
          {advice.command ? (
            <Action.CopyToClipboard
              title={advice.kind === "not-found" ? "Copy Status Command" : "Copy Command"}
              content={advice.command}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          {props.onRetry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.onRetry} /> : null}
          {advice.kind === "no-queue" ? (
            <Action.OpenInBrowser title="Learn About Merge Queues" url={MERGE_QUEUE_DOCS} />
          ) : null}
          {advice.kind === "missing" ? (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function EnterBranch(props: { selection: RepoSelection; onPick: (selection: RepoSelection) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Use Branch"
            icon={Icon.CheckCircle}
            onSubmit={(values: { branch: string }) => {
              const branch = values.branch.trim();
              props.onPick({ ...props.selection, branch: branch || undefined });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Repository"
        text={`${props.selection.owner}/${props.selection.name}. Enter the branch its merge queue targets.`}
      />
      <Form.TextField
        id="branch"
        title="Branch"
        placeholder="develop"
        defaultValue={props.selection.branch}
        info="Leave empty to use the repository's default branch."
      />
    </Form>
  );
}
