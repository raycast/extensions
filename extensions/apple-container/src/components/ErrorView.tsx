import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { ContainerError, errorMessage, startService } from "../lib/container";
import { startServiceInTerminal } from "../lib/terminal";
import { withToast } from "../lib/toast";

const SERVICE_DOWN_MARKDOWN = `# Container Service Not Running

The Apple \`container\` system service isn't running, so commands can't reach the daemon.

Start it with the action below, or run \`container system start\` in a terminal.`;

function notFoundMarkdown(error: ContainerError): string {
  return `# Container CLI Not Found

${error.message}

1. Install \`container\` from the [GitHub releases page](https://github.com/apple/container/releases).
2. Or set the correct path under **Extensions → Apple Container → Container CLI Path**.`;
}

function genericMarkdown(message: string, details: string): string {
  const block = details ? `\n\n\`\`\`\n${details}\n\`\`\`` : "";
  return `# Something Went Wrong

${message}${block}`;
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const containerError = error instanceof ContainerError ? error : undefined;
  const kind = containerError?.kind ?? "unknown";

  if (kind === "service-down") {
    return (
      <Detail
        navigationTitle="Service Not Running"
        markdown={SERVICE_DOWN_MARKDOWN}
        actions={
          <ActionPanel>
            <Action
              title="Start Container Service"
              icon={Icon.Play}
              onAction={() =>
                withToast({
                  action: startService,
                  onStart: "Starting container service…",
                  onSuccess: "Container service started",
                  onFailure: (failure) => ({ title: "Failed to start service", message: errorMessage(failure) }),
                })().then(onRetry)
              }
            />
            <Action title="Start in Terminal" icon={Icon.Terminal} onAction={() => startServiceInTerminal()} />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (kind === "not-found" && containerError) {
    return (
      <Detail
        navigationTitle="Binary Not Found"
        markdown={notFoundMarkdown(containerError)}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Installation Page" url="https://github.com/apple/container/releases" />
            <Action
              title="Retry"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRetry}
            />
          </ActionPanel>
        }
      />
    );
  }

  const message = errorMessage(error);
  const details = (containerError?.stderr.trim() || containerError?.stdout.trim()) ?? "";
  return (
    <Detail
      navigationTitle="Error"
      markdown={genericMarkdown(message, details)}
      actions={
        <ActionPanel>
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRetry}
          />
          <Action.CopyToClipboard title="Copy Error" content={details ? `${message}\n\n${details}` : message} />
        </ActionPanel>
      }
    />
  );
}
