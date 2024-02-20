import { ActionPanel, Action, List, useNavigation } from "@raycast/api";

import {
  AddTunnel,
  BaseActions,
  EmptySessionsView,
  EmptyTunnelsView,
  StopAgentAction,
  StopTunnelAction,
} from "./components";
import { formatDate } from "./utils/date";
import { useReservedDomains, useTunnelSessions } from "./hooks";

export default function TunnelsList() {
  const { push } = useNavigation();

  const { isLoading: isLoadingSessions, data: dataSessions, revalidate: revalidateSessions } = useTunnelSessions();

  const { isLoading: isLoadingDomains, data: dataDomains, revalidate: revalidateDomains } = useReservedDomains();

  const reload = () => {
    revalidateSessions();
    revalidateDomains();
  };

  return (
    <List
      searchBarPlaceholder="Search tunnels"
      navigationTitle="Manage Tunnels"
      isLoading={isLoadingSessions || isLoadingDomains}
    >
      {!dataSessions || !dataSessions.length ? (
        <EmptySessionsView
          goToCreate={() =>
            push(<AddTunnel revalidate={revalidateSessions} domains={dataDomains?.reserved_domains || []} />)
          }
          reload={reload}
        />
      ) : (
        dataSessions.map((session) => (
          <List.Section
            key={session.id}
            title={`Session ${session.id.slice(3)}`}
            subtitle={`Started on ${formatDate(new Date(session.started_at))}`}
          >
            {session.tunnels.length === 0 ? (
              <EmptyTunnelsView
                tunnelSessionId={session.id}
                goToCreate={() =>
                  push(<AddTunnel revalidate={revalidateSessions} domains={dataDomains?.reserved_domains || []} />)
                }
                reload={reload}
              />
            ) : (
              session.tunnels.map((tunnel) => (
                <List.Item
                  key={tunnel.id}
                  title={tunnel.public_url}
                  subtitle={`Forwards to ➡️ ${tunnel.forwards_to}`}
                  accessories={tunnel.metadata ? [{ tag: tunnel.metadata }] : []}
                  actions={
                    <ActionPanel title={tunnel.public_url}>
                      <Action.CopyToClipboard title="Copy URL" content={tunnel.public_url} />
                      <Action.OpenInBrowser url={tunnel.public_url} />
                      <ActionPanel.Section title="Danger zone">
                        {tunnel.local !== null && (
                          <StopTunnelAction
                            tunnelName={tunnel.local?.name || ""}
                            tunnelUrl={tunnel.public_url}
                            revalidateTunelSessions={revalidateSessions}
                          />
                        )}
                        <StopAgentAction tunnelSessionId={session.id} revalidateTunelSessions={revalidateSessions} />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <BaseActions
                          goToCreate={() =>
                            push(
                              <AddTunnel
                                revalidate={revalidateSessions}
                                domains={dataDomains?.reserved_domains || []}
                              />,
                            )
                          }
                          reload={reload}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))
            )}
          </List.Section>
        ))
      )}
    </List>
  );
}
