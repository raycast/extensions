import { ActionPanel, Action, List, Detail, Icon, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import { listCommands, runCommand, getCommand } from "../api/commands";
import { Command } from "../types/command";
import { getCommandStatusIcon } from "../utils/status-icons";
import { timeAgo } from "../utils/dates";

interface Props {
  environmentId: string;
  environmentName: string;
}

export default function CommandList({ environmentId, environmentName }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise((envId: string) => listCommands(envId), [environmentId]);

  return (
    <List isLoading={isLoading} navigationTitle={`${environmentName} — Commands`}>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Terminal}
          title="Run New Command"
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Command"
                icon={Icon.Terminal}
                target={<RunCommandForm environmentId={environmentId} onCommandRun={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Command History">
        {data?.data.map((cmd) => (
          <CommandListItem key={cmd.id} command={cmd} />
        ))}
      </List.Section>
    </List>
  );
}

function CommandListItem({ command }: { command: Command }) {
  const { attributes } = command;
  const statusIcon = getCommandStatusIcon(attributes.status);

  return (
    <List.Item
      icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
      title={attributes.command}
      accessories={[
        { tag: { value: attributes.status.replace("command.", ""), color: statusIcon.color } },
        ...(attributes.exit_code !== null ? [{ text: `exit: ${attributes.exit_code}` }] : []),
        { text: timeAgo(attributes.created_at) },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="View Output" icon={Icon.Eye} target={<CommandDetail commandId={command.id} />} />
          <Action.CopyToClipboard
            title="Copy Command"
            content={attributes.command}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function RunCommandForm({ environmentId, onCommandRun }: { environmentId: string; onCommandRun: () => void }) {
  const { push } = useNavigation();

  async function handleSubmit(values: { command: string }) {
    if (!values.command.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Command cannot be empty" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Running command..." });
      const result = await runCommand(environmentId, values.command);
      await showToast({ style: Toast.Style.Success, title: "Command submitted" });
      onCommandRun();
      push(<CommandDetail commandId={result.data.id} />);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to run command", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Run Command"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" icon={Icon.Terminal} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="command" title="Command" placeholder="php artisan --version" />
    </Form>
  );
}

function CommandDetail({ commandId }: { commandId: string }) {
  const { data, isLoading, revalidate } = useCachedPromise((id: string) => getCommand(id), [commandId]);

  const cmd = data?.data;
  const attrs = cmd?.attributes;
  const isRunning =
    attrs?.status === "pending" || attrs?.status === "command.created" || attrs?.status === "command.running";

  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      if (isRunningRef.current) {
        revalidate();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isRunning, revalidate]);

  const markdown = attrs
    ? `# Command Output

\`\`\`
$ ${attrs.command}
\`\`\`

${attrs.output ? `\`\`\`\n${attrs.output}\n\`\`\`` : isRunning ? "_Command is still running..._" : "_No output_"}

${attrs.failure_reason ? `\n> **Error:** ${attrs.failure_reason}` : ""}
`
    : "Loading...";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        attrs ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Status" text={attrs.status} />
            {attrs.exit_code !== null && <Detail.Metadata.Label title="Exit Code" text={String(attrs.exit_code)} />}
            <Detail.Metadata.Label title="Started" text={attrs.started_at ?? "Pending"} />
            <Detail.Metadata.Label title="Finished" text={attrs.finished_at ?? "N/A"} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {attrs?.output && <Action.CopyToClipboard title="Copy Output" content={attrs.output} />}
        </ActionPanel>
      }
    />
  );
}
