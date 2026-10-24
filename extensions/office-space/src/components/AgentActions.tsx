import { Action, ActionPanel, Alert, confirmAlert, Icon, open, showToast, Toast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { canMessage, linkTo } from "../lib/format";
import { hub } from "../lib/hub";
import { Agent } from "../lib/types";
import { AgentDetailView } from "./AgentDetailView";
import { MessageForm } from "./MessageForm";

/** Runs a hub command for an agent with a toast, then refreshes. */
export async function agentCommand(agent: Agent, args: string[], done: string, onChange?: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: `${done.replace(/ed$/, "ing")}…` });
  try {
    await hub(args);
    toast.style = Toast.Style.Success;
    toast.title = `${done}: ${agent.name}`;
    onChange?.();
  } catch (error) {
    await showFailureToast(error, { title: `Couldn't do that for ${agent.name}` });
  }
}

/** A Claude Code permission prompt in a terminal Office Space hosts. */
export function isPermissionPrompt(agent: Agent): boolean {
  return (
    agent.status === "needsInput" &&
    canMessage(agent) &&
    agent.adapter === "claude-code" &&
    /permission|approve|proceed/i.test(agent.statusDetail ?? "")
  );
}

export function AgentActions(props: { agent: Agent; onChange?: () => void; showDetail?: boolean }) {
  const { agent, onChange } = props;
  const hosted = canMessage(agent);
  return (
    <ActionPanel title={agent.name}>
      <ActionPanel.Section>
        {hosted && (
          <Action.Push title="Message" icon={Icon.Message} target={<MessageForm agent={agent} onSent={onChange} />} />
        )}
        <Action
          title="Open in Office Space"
          icon={Icon.AppWindow}
          onAction={() => open(linkTo(`agent/${encodeURIComponent(agent.id)}`))}
        />
        {props.showDetail !== false && (
          <Action.Push
            title="Show Brief and Activity"
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<AgentDetailView agent={agent} onChange={onChange} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {isPermissionPrompt(agent) && (
          <>
            <Action
              title="Approve"
              icon={Icon.Check}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              onAction={() => agentCommand(agent, ["approve", agent.id], "Approved", onChange)}
            />
            <Action
              title="Decline"
              icon={Icon.XMarkCircle}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => agentCommand(agent, ["deny", agent.id], "Declined", onChange)}
            />
          </>
        )}
        {(agent.status === "finished" || agent.status === "needsInput") && (
          <Action
            title="Mark as Seen"
            icon={Icon.Eye}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => agentCommand(agent, ["ack", agent.id], "Marked as seen", onChange)}
          />
        )}
        {hosted && agent.status === "working" && (
          <Action
            title="Interrupt"
            icon={Icon.Pause}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={() => agentCommand(agent, ["interrupt", agent.id], "Interrupted", onChange)}
          />
        )}
        {!hosted && agent.adapter !== "custom" && agent.status === "ended" && (
          <Action
            title="Resume in Office Space"
            icon={Icon.ArrowClockwise}
            onAction={() => agentCommand(agent, ["resume", agent.id], "Resumed", onChange)}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Open
          title="Open Folder in Cursor"
          icon={Icon.Code}
          target={agent.worktreePath ?? agent.workingDirectory}
          application="Cursor"
        />
        <Action.ShowInFinder path={agent.worktreePath ?? agent.workingDirectory} />
        {agent.ports.length > 0 && (
          <Action.OpenInBrowser title={`Open Localhost:${agent.ports[0]}`} url={`http://localhost:${agent.ports[0]}`} />
        )}
        <Action.CopyToClipboard title="Copy Folder Path" content={agent.worktreePath ?? agent.workingDirectory} />
      </ActionPanel.Section>
      {agent.status !== "ended" && (
        <ActionPanel.Section>
          <Action
            title="Stop Agent"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: `Stop ${agent.name}?`,
                message: hosted ? "Its terminal is closed." : "Office Space asks the process to quit.",
                primaryAction: { title: "Stop", style: Alert.ActionStyle.Destructive },
              });
              if (confirmed) await agentCommand(agent, ["stop-agent", agent.id], "Stopped", onChange);
            }}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}
