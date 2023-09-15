import { ActionPanel, Action, List, showToast, Toast, Icon, useNavigation } from "@raycast/api";

import { Tunnel, stopTunnel } from "./api";
import AddTunnel from "./components/add-tunnel";
import BaseActions from "./components/base-actions";
import { useReservedDomains, useTunnels } from "./hooks";

export default function TunnelsList() {
  const { push } = useNavigation();

  const { isLoading: isLoadingTunnels, data: dataTunnels, revalidate: revalidateTunnels } = useTunnels();
  const { isLoading: isLoadingDomains, data: dataDomains, revalidate: revalidateDomains } = useReservedDomains();

  const handleStop = async (tunnel: Tunnel) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Stopping Tunnel ${tunnel.public_url}...`,
    });

    try {
      await stopTunnel(tunnel.tunnel_session.id);

      toast.style = Toast.Style.Success;
      toast.title = "Tunnel stopped!";
    } catch (err) {
      console.log(err);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to stop tunnel";
      if (err instanceof Error) {
        toast.message = err.message;
      }
    }

    revalidateTunnels();
  };

  const reload = () => {
    revalidateTunnels();
    revalidateDomains();
  };

  return (
    <List navigationTitle="Manage Tunnels" isLoading={isLoadingTunnels || isLoadingDomains}>
      {!dataTunnels || dataTunnels.tunnels.length === 0 ? (
        <List.EmptyView
          icon={Icon.Link}
          title="Create ngrok tunnel"
          description="⌘ + N"
          actions={
            <ActionPanel>
              <BaseActions
                goToCreate={() =>
                  push(<AddTunnel revalidate={revalidateTunnels} domains={dataDomains?.reserved_domains || []} />)
                }
                reload={reload}
              />
            </ActionPanel>
          }
        />
      ) : (
        dataTunnels.tunnels.map((tunnel) => (
          <List.Item
            key={tunnel.id}
            title={tunnel.public_url}
            subtitle={`Forwards to ➡️ ${tunnel.forwards_to}${tunnel.metadata ? ` - [${tunnel.metadata}]` : ""}`}
            actions={
              <ActionPanel title={tunnel.public_url}>
                <Action.CopyToClipboard title="Copy URL" content={tunnel.public_url} />
                <Action.OpenInBrowser url={tunnel.public_url} />
                <ActionPanel.Section title="Danger zone">
                  <Action
                    icon={Icon.Stop}
                    title="Stop Tunnel"
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                    onAction={() => handleStop(tunnel)}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <BaseActions
                    goToCreate={() =>
                      push(<AddTunnel revalidate={revalidateTunnels} domains={dataDomains?.reserved_domains || []} />)
                    }
                    reload={reload}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
