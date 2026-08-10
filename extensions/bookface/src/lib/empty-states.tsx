import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import {
  INSTALL_COMMAND,
  LOGIN_COMMAND,
  UPDATE_COMMAND,
  stripAnsi,
  type VersionGate,
} from "./yc";
import { UpdateYcCli } from "../views/updater";

// Shared title + lead so the List (EmptyView) and Detail variants of the
// "update required" state read as the same screen across all three commands.
// "YC CLI" is the product in prose; `yc` stays lowercase as the literal binary.
const UPDATE_REQUIRED_TITLE = "Update Required";
const UPDATE_REQUIRED_LEAD =
  "This version of the YC CLI is no longer supported. Update it to keep using the extension.";

function gateSummary(gate?: VersionGate): string {
  if (!gate) return "";
  const parts: string[] = [];
  if (gate.current) parts.push(`current ${gate.current}`);
  if (gate.minimum) parts.push(`requires ${gate.minimum}+`);
  return parts.join(", ");
}

function UpdateCliPush({
  gate,
  onRetry,
}: {
  gate?: VersionGate;
  onRetry?: () => void;
}) {
  return (
    <Action.Push
      title="Update YC CLI"
      icon={Icon.Download}
      target={<UpdateYcCli gate={gate} onRetry={onRetry} />}
    />
  );
}

function CopyInstall() {
  return (
    <Action.CopyToClipboard
      title="Copy Install Command"
      content={INSTALL_COMMAND}
    />
  );
}

function CopyLogin() {
  return (
    <Action.CopyToClipboard
      title="Copy Login Command"
      content={LOGIN_COMMAND}
    />
  );
}

function CopyUpdate() {
  return (
    <Action.CopyToClipboard
      title="Copy Update Command"
      content={UPDATE_COMMAND}
    />
  );
}

// Auth recovery: Raycast has no window-focus hook, so we can't auto-detect the
// user returning from a browser login. A clearly-labeled primary "Check Again"
// re-runs the command's fetch — one keystroke once they've authenticated, with
// no idle polling against the rate-limited CLI.
function CheckAgainAction({ onRetry }: { onRetry: () => void }) {
  return (
    <Action
      title="Check Again"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRetry}
    />
  );
}

function ReloadAction({ onRetry }: { onRetry: () => void }) {
  return (
    <Action
      title="Reload"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRetry}
    />
  );
}

export function MissingCliEmpty() {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="YC CLI Not Found"
      description="Install the YC CLI to use this extension."
      actions={
        <ActionPanel>
          <CopyInstall />
        </ActionPanel>
      }
    />
  );
}

export function NotAuthedEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Not Logged In"
      description={`Run "${LOGIN_COMMAND}" in your terminal, then check again.`}
      actions={
        <ActionPanel>
          {onRetry ? <CheckAgainAction onRetry={onRetry} /> : null}
          <CopyLogin />
        </ActionPanel>
      }
    />
  );
}

export function UpdateRequiredEmpty({
  gate,
  onRetry,
}: {
  gate?: VersionGate;
  onRetry?: () => void;
}) {
  // EmptyView gives one description line, so fold the version context inline.
  const summary = gateSummary(gate);
  return (
    <List.EmptyView
      icon={Icon.Download}
      title={UPDATE_REQUIRED_TITLE}
      description={
        summary
          ? `This version of the YC CLI is no longer supported (${summary}).`
          : UPDATE_REQUIRED_LEAD
      }
      actions={
        <ActionPanel>
          <UpdateCliPush gate={gate} onRetry={onRetry} />
          <CopyUpdate />
        </ActionPanel>
      }
    />
  );
}

export function ErrorEmpty({ message }: { message: string }) {
  // Strip at the sink so no caller can leak raw CLI ANSI control bytes
  // (the `Ø[K` artifact) into the surface.
  const clean = stripAnsi(message);
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Search Failed"
      description={clean}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={clean} />
        </ActionPanel>
      }
    />
  );
}

export function MissingCliDetail({ onRetry }: { onRetry?: () => void }) {
  const markdown = `# YC CLI Not Found

The Bookface extension shells out to the \`yc\` CLI, which doesn't appear to be installed.

## Install it

\`\`\`bash
${INSTALL_COMMAND}
\`\`\`

Then run \`${LOGIN_COMMAND}\` once in your terminal to authenticate.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <CopyInstall />
          {onRetry ? <ReloadAction onRetry={onRetry} /> : null}
        </ActionPanel>
      }
    />
  );
}

export function NotAuthedDetail({ onRetry }: { onRetry?: () => void }) {
  const markdown = `# Not Logged In

Run \`${LOGIN_COMMAND}\` in your terminal to authenticate with Bookface, then **Check Again**.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* Check Again is primary: the user authenticates elsewhere, returns,
              and one keystroke re-checks — no window-focus hook exists to do it
              automatically, and polling would hit the CLI rate limit. */}
          {onRetry ? <CheckAgainAction onRetry={onRetry} /> : null}
          <CopyLogin />
        </ActionPanel>
      }
    />
  );
}

export function ErrorDetail({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  // Strip at the sink so no caller can leak raw CLI ANSI control bytes
  // (the `Ø[K` artifact) into the surface.
  const clean = stripAnsi(message);
  const markdown = `# Something went wrong\n\n\`\`\`\n${clean}\n\`\`\``;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={clean} />
          {onRetry ? <ReloadAction onRetry={onRetry} /> : null}
        </ActionPanel>
      }
    />
  );
}
