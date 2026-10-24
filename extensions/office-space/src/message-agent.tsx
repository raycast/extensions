import { Action, ActionPanel, Icon, LaunchProps, List, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { MessageForm } from "./components/MessageForm";
import { Unavailable } from "./components/Unavailable";
import { canMessage, doing, place, statusIcon } from "./lib/format";
import { hub } from "./lib/hub";
import { useAgents } from "./lib/useAgents";
import { Agent } from "./lib/types";

export default function Command(props: LaunchProps<{ arguments: { message?: string } }>) {
  const message = props.arguments.message?.trim() ?? "";
  const { data, isLoading, error } = useAgents();
  const agents = (data ?? []).filter(canMessage);

  async function sendNow(agent: Agent) {
    try {
      await hub(["send", agent.id, message]);
      await showHUD(`Sent to ${agent.name}`);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't send" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={message ? `Send "${message}" to…` : "Which agent?"}>
      {error && !data ? (
        <Unavailable error={error} />
      ) : (
        <>
          <List.EmptyView
            title="No agents to message"
            description="Office Space can message agents it started (or resumed). Start one with Run Recipe or from the menu."
          />
          {agents.map((agent) => (
            <List.Item
              key={agent.id}
              icon={statusIcon(agent.status)}
              title={agent.name}
              subtitle={doing(agent) ?? place(agent)}
              keywords={[place(agent), agent.project?.branch ?? ""]}
              actions={
                <ActionPanel>
                  {message ? (
                    <>
                      <Action title="Send" icon={Icon.Message} onAction={() => sendNow(agent)} />
                      <Action.Push
                        title="Edit Message"
                        icon={Icon.Pencil}
                        target={<MessageForm agent={agent} initial={message} />}
                      />
                    </>
                  ) : (
                    <Action.Push title="Write Message" icon={Icon.Message} target={<MessageForm agent={agent} />} />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}
