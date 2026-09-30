import { ActionPanel, Action, List, useNavigation, Icon } from "@raycast/api";

import {
  AddTunnel,
  BaseActions,
  EmptySessionsView,
  EmptyTunnelsView,
  StopAgentAction,
  StopTunnelAction,
} from "./components";
import { useReservedDomains, useTunnelSessions } from "./hooks";
import { formatDate, getTunnelAccessories, shortenTunnelId } from "./utils";

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
                  title={{
                    value: tunnel.public_url || shortenTunnelId(tunnel.id),
                    tooltip: tunnel.id,
                  }}
                  subtitle={`➡️ ${tunnel.forwards_to}`}
                  accessories={getTunnelAccessories(tunnel.metadata, tunnel.labels)}
                  icon={
                    tunnel.public_url
                      ? { value: Icon.Monitor, tooltip: "Local tunnel" }
                      : { value: Icon.Globe, tooltip: "Cloud Edge tunnel" }
                  }
                  actions={
                    <ActionPanel title={tunnel.public_url || tunnel.id}>
                      <Action.CopyToClipboard
                        title={tunnel.public_url ? "Copy URL" : "Copy Tunnel ID"}
                        content={tunnel.public_url || tunnel.id}
                      />
                      {tunnel.public_url && <Action.OpenInBrowser url={tunnel.public_url} />}
                      <ActionPanel.Section title="Danger zone">
                        {tunnel.local !== null && (
                          <StopTunnelAction
                            tunnelName={tunnel.local?.name || tunnel.id}
                            tunnelUrl={tunnel.public_url || tunnel.id}
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
