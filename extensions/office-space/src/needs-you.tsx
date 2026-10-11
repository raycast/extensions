import { Action, ActionPanel, Icon, List, open, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { AgentActions, agentCommand, isPermissionPrompt } from "./components/AgentActions";
import { agentMarkdown } from "./components/AgentDetailView";
import { MessageForm } from "./components/MessageForm";
import { Unavailable } from "./components/Unavailable";
import { canMessage, linkTo, needsYou, place, statusIcon } from "./lib/format";
import { hub } from "./lib/hub";
import { useAgents } from "./lib/useAgents";
import { Agent, AgentDetail, TailOutput } from "./lib/types";

/** The question and recent output for one waiting agent. */
function WaitingDetail(props: { agent: Agent }) {
  const { agent } = props;
  const { data: detail, isLoading } = usePromise((id: string) => hub<AgentDetail>(["agent", id]), [agent.id]);
  const { data: tail } = usePromise(
    async (id: string, hosted: boolean) => (hosted ? hub<TailOutput>(["tail", id, "-n", "30"]) : undefined),
    [agent.id, canMessage(agent)],
  );
  return <List.Item.Detail isLoading={isLoading} markdown={agentMarkdown(detail, tail, agent)} />;
}

export default function Command() {
  const { data, isLoading, error, revalidate } = useAgents();
  const waiting = (data ?? [])
    .filter(needsYou)
    .sort((a, b) => (a.status === "needsInput" ? -1 : 0) - (b.status === "needsInput" ? -1 : 0));

  return (
    <List isLoading={isLoading} isShowingDetail={waiting.length > 0} searchBarPlaceholder="Agents waiting on you">
      {error && !data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.CheckCircle}
            title="Nothing needs you"
            description="Every agent is working or idle."
          />
          {waiting.map((agent) => (
            <List.Item
              key={agent.id}
              icon={statusIcon(agent.status)}
              title={agent.name}
              subtitle={place(agent)}
              detail={<WaitingDetail agent={agent} />}
              actions={
                isPermissionPrompt(agent) || canMessage(agent) ? (
                  <ActionPanel title={agent.name}>
                    {isPermissionPrompt(agent) && (
                      <Action
                        title="Approve"
                        icon={Icon.Check}
                        onAction={() => agentCommand(agent, ["approve", agent.id], "Approved", revalidate)}
                      />
                    )}
                    <Action.Push
                      title="Reply"
                      icon={Icon.Message}
                      target={<MessageForm agent={agent} onSent={revalidate} />}
                    />
                    {isPermissionPrompt(agent) && (
                      <Action
                        title="Decline"
                        icon={Icon.XMarkCircle}
                        shortcut={Keyboard.Shortcut.Common.New}
                        onAction={() => agentCommand(agent, ["deny", agent.id], "Declined", revalidate)}
                      />
                    )}
                    <Action
                      title="Mark as Seen"
                      icon={Icon.Eye}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() => agentCommand(agent, ["ack", agent.id], "Marked as seen", revalidate)}
                    />
                    <Action
                      title="Open in Office Space"
                      icon={Icon.AppWindow}
                      shortcut={Keyboard.Shortcut.Common.Open}
                      onAction={() => open(linkTo(`agent/${encodeURIComponent(agent.id)}`))}
                    />
                  </ActionPanel>
                ) : (
                  <AgentActions agent={agent} onChange={revalidate} />
                )
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
