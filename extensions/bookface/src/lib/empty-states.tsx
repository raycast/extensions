import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { INSTALL_COMMAND, LOGIN_COMMAND } from "./yc";

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

function ReloadAction({ onRetry }: { onRetry: () => void }) {
  return (
    <Action title="Reload" icon={Icon.ArrowClockwise} onAction={onRetry} />
  );
}

export function MissingCliEmpty() {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="yc CLI Not Found"
      description="Install the yc CLI to use this extension."
      actions={
        <ActionPanel>
          <CopyInstall />
        </ActionPanel>
      }
    />
  );
}

export function NotAuthedEmpty() {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Not Logged In"
      description={`Run "${LOGIN_COMMAND}" in your terminal.`}
      actions={
        <ActionPanel>
          <CopyLogin />
        </ActionPanel>
      }
    />
  );
}

export function ErrorEmpty({ message }: { message: string }) {
  return (
    <List.EmptyView
      icon={Icon.ExclamationMark}
      title="Search Failed"
      description={message}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={message} />
        </ActionPanel>
      }
    />
  );
}

export function MissingCliDetail({ onRetry }: { onRetry?: () => void }) {
  const markdown = `# yc CLI Not Found

The Y Combinator extension shells out to the \`yc\` CLI, which doesn't appear to be installed.

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

Run \`${LOGIN_COMMAND}\` in your terminal to authenticate with Bookface, then try again.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <CopyLogin />
          {onRetry ? <ReloadAction onRetry={onRetry} /> : null}
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
  const markdown = `# Something went wrong\n\n\`\`\`\n${message}\n\`\`\``;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Error" content={message} />
          {onRetry ? <ReloadAction onRetry={onRetry} /> : null}
        </ActionPanel>
      }
    />
  );
}
