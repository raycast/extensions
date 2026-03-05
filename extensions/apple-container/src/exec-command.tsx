import { Form, ActionPanel, Action, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { containerExec } from "./lib/container";

export default function ExecCommand({ containerName }: { containerName: string }) {
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (output !== null) {
    return (
      <Detail
        navigationTitle={`${containerName} — Output`}
        markdown={"```\n" + output + "\n```"}
        actions={
          <ActionPanel>
            <Action title="Run Another" icon={Icon.ArrowClockwise} onAction={() => setOutput(null)} />
            <Action.CopyToClipboard title="Copy Output" content={output} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`${containerName} — Run Command`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Command"
            icon={Icon.Terminal}
            onSubmit={async (values: { command: string }) => {
              const cmd = values.command.trim();
              if (!cmd) {
                await showToast(Toast.Style.Failure, "Command is required");
                return;
              }
              setIsLoading(true);
              try {
                const result = await containerExec(["exec", containerName, ...cmd.split(/\s+/)]);
                setOutput(result || "(no output)");
              } catch (e) {
                setOutput(`Error: ${String(e)}`);
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="command" title="Command" placeholder="e.g. ls -la /app, cat /etc/os-release" autoFocus />
      <Form.Description text={`Runs non-interactively in "${containerName}"`} />
    </Form>
  );
}
