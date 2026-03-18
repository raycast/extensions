import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  copyTextToClipboard,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { CliTailscaleClient } from "./clients/cli-tailscale-client";
import { SendFilesForm, ReceiveFilesForm, ConfigureServiceForm } from "./forms";
import { TailscaleBinaryNotFoundError, TailscaleCommandError } from "./lib/errors";
import {
  renderAdvancedSettingDetail,
  renderDeviceDetail,
  renderExitNodeDetail,
  renderNetcheckDetail,
  renderPeerDetail,
  renderServiceStatusDetail,
} from "./lib/markdown";
import { getExtensionPreferences, resolveRefreshInterval, resolveTailscalePath } from "./preferences";
import {
  AdvancedSettingsState,
  DashboardState,
  ExitNode,
  NetcheckResult,
  PeerNode,
  ServiceKind,
  ServiceStatus,
} from "./types";

interface SettingDefinition {
  key: keyof AdvancedSettingsState;
  title: string;
  description: string;
  icon: Icon;
}

const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: "acceptDns",
    title: "Accept DNS",
    description: "Use DNS configuration pushed by your tailnet admin settings.",
    icon: Icon.Globe,
  },
  {
    key: "acceptRoutes",
    title: "Accept Routes",
    description: "Allow traffic to use routes advertised by other Tailscale nodes.",
    icon: Icon.Network,
  },
  {
    key: "ssh",
    title: "Tailscale SSH",
    description: "Run the local Tailscale SSH server for policy-managed SSH access.",
    icon: Icon.Terminal,
  },
  {
    key: "webClient",
    title: "Web Client",
    description: "Expose the web client on port 5252 over Tailscale.",
    icon: Icon.AppWindow,
  },
  {
    key: "shieldsUp",
    title: "Shields Up",
    description: "Block all incoming connections to this device.",
    icon: Icon.Shield,
  },
  {
    key: "exitNodeAllowLanAccess",
    title: "Exit Node LAN Access",
    description: "Keep access to your local LAN while routing through an exit node.",
    icon: Icon.Network,
  },
];

function getConnectionIcon(state: DashboardState): { source: Icon; tintColor?: Color } {
  switch (state.connectionState) {
    case "connected":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "needs-login":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "stopped":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "starting":
      return { source: Icon.Clock, tintColor: Color.Yellow };
    default:
      return { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText };
  }
}

function getPeerIcon(peer: PeerNode): { source: Icon; tintColor?: Color } {
  return peer.online
    ? { source: Icon.CircleFilled, tintColor: Color.Green }
    : { source: Icon.Circle, tintColor: Color.SecondaryText };
}

function getHealthIcon(level: "info" | "warning" | "error"): { source: Icon; tintColor?: Color } {
  switch (level) {
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "warning":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    default:
      return { source: Icon.Info, tintColor: Color.Blue };
  }
}

function getSettingIcon(enabled: boolean, fallback: Icon): { source: Icon; tintColor?: Color } {
  return enabled
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : { source: fallback, tintColor: Color.SecondaryText };
}

function getServiceIcon(serviceStatus?: ServiceStatus): { source: Icon; tintColor?: Color } {
  return serviceStatus?.enabled
    ? { source: Icon.Globe, tintColor: Color.Green }
    : { source: Icon.Globe, tintColor: Color.SecondaryText };
}

function getErrorMetadata(error: unknown): { title: string; description: string; icon: Icon } {
  if (error instanceof TailscaleBinaryNotFoundError) {
    return {
      title: "Tailscale CLI Not Found",
      description: "Check your PATH or set a custom CLI path in extension preferences.",
      icon: Icon.ExclamationMark,
    };
  }

  if (error instanceof TailscaleCommandError) {
    return {
      title: "Tailscale Command Failed",
      description: error.stderr || error.stdout || error.message,
      icon: Icon.XMarkCircle,
    };
  }

  return {
    title: "Unable to Load Tailscale",
    description: error instanceof Error ? error.message : "An unknown error occurred.",
    icon: Icon.ExclamationMark,
  };
}

async function performMutation(
  task: () => Promise<void>,
  loadingTitle: string,
  successTitle: string,
  failureTitle: string,
  refresh: () => Promise<unknown>,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: loadingTitle });

  try {
    await task();
    toast.style = Toast.Style.Success;
    toast.title = successTitle;
    await refresh();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureTitle;
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}

export default function Command() {
  const preferences = getExtensionPreferences();
  const refreshIntervalSeconds = resolveRefreshInterval(preferences);
  const tailscalePath = resolveTailscalePath(preferences);
  const client = useMemo(() => new CliTailscaleClient(tailscalePath), [tailscalePath]);
  const [netcheck, setNetcheck] = useState<NetcheckResult>();

  const {
    data,
    error,
    isLoading,
    revalidate: refresh,
  } = useCachedPromise(
    async (binaryPath: string) => {
      return new CliTailscaleClient(binaryPath).getDashboardState();
    },
    [tailscalePath],
    {
      keepPreviousData: true,
      failureToastOptions: {
        title: "Failed to load Tailscale status",
      },
    },
  );

  useEffect(() => {
    const interval = setInterval(() => {
      void refresh();
    }, refreshIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [refresh, refreshIntervalSeconds]);

  const peers = useMemo(() => {
    if (!data) {
      return [];
    }

    return preferences.showOfflinePeers ? data.peers : data.peers.filter((peer) => peer.online);
  }, [data, preferences.showOfflinePeers]);

  const taildropPeers = useMemo(() => peers.filter((peer) => !peer.noFileSharingReason), [peers]);
  const canManageNetwork = data && data.connectionState !== "needs-login" && data.connectionState !== "stopped";

  const mutationRefresh = async () => {
    await refresh();
  };

  const handleConnect = async () => {
    await performMutation(
      () => client.connect(),
      "Connecting to Tailscale",
      "Connected to Tailscale",
      "Could Not Connect",
      mutationRefresh,
    );
  };

  const handleDisconnect = async () => {
    const confirmed = await confirmAlert({
      title: "Disconnect Tailscale?",
      message: "This will disconnect the local machine from your tailnet until you reconnect.",
      primaryAction: {
        title: "Disconnect",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await performMutation(
      () => client.disconnect(),
      "Disconnecting Tailscale",
      "Disconnected from Tailscale",
      "Could Not Disconnect",
      mutationRefresh,
    );
  };

  const handleSetExitNode = async (exitNode: ExitNode) => {
    const confirmed = await confirmAlert({
      title: `Use ${exitNode.title} as exit node?`,
      message: "Traffic will route through the selected exit node until you clear it.",
      primaryAction: {
        title: "Use Exit Node",
      },
    });

    if (!confirmed) {
      return;
    }

    await performMutation(
      () => client.setExitNode(exitNode.id),
      `Setting exit node to ${exitNode.title}`,
      `Using ${exitNode.title}`,
      "Could Not Set Exit Node",
      mutationRefresh,
    );
  };

  const handleClearExitNode = async () => {
    const confirmed = await confirmAlert({
      title: "Clear current exit node?",
      message: "Traffic will stop routing through the currently selected exit node.",
      primaryAction: {
        title: "Clear Exit Node",
      },
    });

    if (!confirmed) {
      return;
    }

    await performMutation(
      () => client.clearExitNode(),
      "Clearing exit node",
      "Cleared exit node",
      "Could Not Clear Exit Node",
      mutationRefresh,
    );
  };

  const handlePingPeer = async (peer: PeerNode) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Pinging ${peer.hostName}` });

    try {
      const result = await client.pingPeer(peer.dnsName || peer.ips[0] || peer.hostName);
      toast.style = Toast.Style.Success;
      toast.title = `Pinged ${peer.hostName}`;
      toast.message = result.summary;
      await showHUD(result.summary);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = `Could Not Ping ${peer.hostName}`;
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleNetcheck = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Running netcheck" });

    try {
      const result = await client.runNetcheck();
      setNetcheck(result);
      toast.style = Toast.Style.Success;
      toast.title = "Netcheck complete";
      toast.message = result.summary;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Run Netcheck";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  };

  const handleToggleSetting = async (key: keyof AdvancedSettingsState, enabled: boolean) => {
    const toggleActions: Record<keyof AdvancedSettingsState, (value: boolean) => Promise<void>> = {
      acceptDns: (value) => client.setAcceptDns(value),
      acceptRoutes: (value) => client.setAcceptRoutes(value),
      ssh: (value) => client.setSsh(value),
      webClient: (value) => client.setWebClient(value),
      shieldsUp: (value) => client.setShieldsUp(value),
      exitNodeAllowLanAccess: (value) => client.setExitNodeLanAccess(value),
    };

    const setting = SETTING_DEFINITIONS.find((item) => item.key === key);
    const verb = enabled ? "Enabled" : "Disabled";

    await performMutation(
      () => toggleActions[key](enabled),
      `${enabled ? "Enabling" : "Disabling"} ${setting?.title ?? "setting"}`,
      `${verb} ${setting?.title ?? "setting"}`,
      `Could Not Update ${setting?.title ?? "setting"}`,
      mutationRefresh,
    );
  };

  const handleResetService = async (kind: ServiceKind) => {
    const confirmed = await confirmAlert({
      title: `Reset ${kind === "serve" ? "Serve" : "Funnel"}?`,
      message: "This removes the current configuration for this service.",
      primaryAction: {
        title: "Reset Configuration",
      },
    });

    if (!confirmed) {
      return;
    }

    await performMutation(
      () => (kind === "serve" ? client.resetServe() : client.resetFunnel()),
      `Resetting ${kind === "serve" ? "Serve" : "Funnel"}`,
      `Reset ${kind === "serve" ? "Serve" : "Funnel"}`,
      `Could Not Reset ${kind === "serve" ? "Serve" : "Funnel"}`,
      mutationRefresh,
    );
  };

  if (error && !data) {
    const metadata = getErrorMetadata(error);

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search Tailscale peers"
        isShowingDetail
        navigationTitle="Tailscale"
      >
        <List.EmptyView
          title={metadata.title}
          description={metadata.description}
          icon={metadata.icon}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
              <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const connectionIcon = data ? getConnectionIcon(data) : { source: Icon.Network };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tailscale"
      searchBarPlaceholder="Search peers, exit nodes, services, and diagnostics"
    >
      {data?.self ? (
        <List.Section title="This Device">
          <List.Item
            id="self"
            title={data.self.hostName}
            subtitle={data.connectionState}
            accessories={[
              ...(data.self.currentExitNodeName ? [{ tag: `Exit: ${data.self.currentExitNodeName}` }] : []),
              { tag: data.backendState },
            ]}
            icon={connectionIcon}
            detail={<List.Item.Detail markdown={renderDeviceDetail(data)} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {data.connectionState === "connected" ? (
                    <Action title="Disconnect" onAction={handleDisconnect} icon={Icon.Power} />
                  ) : data.authUrl ? (
                    <Action.OpenInBrowser title="Open Login Flow" url={data.authUrl} />
                  ) : (
                    <Action title="Connect" onAction={handleConnect} icon={Icon.Power} />
                  )}
                  <Action title="Run Netcheck" onAction={handleNetcheck} icon={Icon.Wifi} />
                  <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Copy">
                  {data.self.ips[0] ? (
                    <Action
                      title="Copy Tailscale IP"
                      onAction={() => copyTextToClipboard(data.self?.ips[0] ?? "")}
                      icon={Icon.Clipboard}
                    />
                  ) : null}
                  {data.self.dnsName ? (
                    <Action
                      title="Copy MagicDNS Name"
                      onAction={() => copyTextToClipboard(data.self?.dnsName ?? "")}
                      icon={Icon.Clipboard}
                    />
                  ) : null}
                </ActionPanel.Section>
                <ActionPanel.Section title="More">
                  {data.self.currentExitNodeName ? (
                    <Action title="Clear Exit Node" onAction={handleClearExitNode} icon={Icon.XMarkCircle} />
                  ) : null}
                  <Action.Push
                    title="Send Taildrop Files"
                    target={<SendFilesForm client={client} onSuccess={mutationRefresh} peers={taildropPeers} />}
                    icon={Icon.Upload}
                  />
                  <Action.Push
                    title="Receive Taildrop Files"
                    target={<ReceiveFilesForm client={client} onSuccess={mutationRefresh} />}
                    icon={Icon.Download}
                  />
                  <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Gear} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {canManageNetwork ? (
        <List.Section title={`Exit Nodes${data.exitNodes.length > 0 ? ` (${data.exitNodes.length})` : ""}`}>
          {data.exitNodes.length > 0 ? (
            data.exitNodes.map((exitNode) => (
              <List.Item
                key={exitNode.id}
                title={exitNode.title}
                subtitle={exitNode.subtitle}
                icon={exitNode.selected ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Globe}
                accessories={exitNode.selected ? [{ tag: "Selected" }] : undefined}
                detail={<List.Item.Detail markdown={renderExitNodeDetail(exitNode)} />}
                actions={
                  <ActionPanel>
                    {exitNode.selected ? (
                      <Action title="Clear Exit Node" onAction={handleClearExitNode} icon={Icon.XMarkCircle} />
                    ) : (
                      <Action title="Use Exit Node" onAction={() => handleSetExitNode(exitNode)} icon={Icon.Globe} />
                    )}
                    <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                  </ActionPanel>
                }
              />
            ))
          ) : (
            <List.Item
              id="no-exit-nodes"
              title="No exit nodes available"
              icon={Icon.Globe}
              detail={
                <List.Item.Detail markdown="# Exit Nodes\n\nNo exit nodes are currently advertised in this tailnet." />
              }
              actions={
                <ActionPanel>
                  <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      ) : null}

      {data ? (
        <List.Section title="Taildrop">
          <List.Item
            id="taildrop-send"
            title="Send Files"
            subtitle={taildropPeers.length > 0 ? `${taildropPeers.length} available targets` : "No eligible targets"}
            icon={Icon.Upload}
            detail={
              <List.Item.Detail
                markdown={`# Taildrop Send\n\nSend one or more local files to another device on your tailnet.${
                  taildropPeers.length > 0
                    ? `\n\nAvailable peers: ${taildropPeers.map((peer) => peer.hostName).join(", ")}`
                    : ""
                }`}
              />
            }
            actions={
              <ActionPanel>
                {taildropPeers.length > 0 ? (
                  <Action.Push
                    title="Send Taildrop Files"
                    target={<SendFilesForm client={client} onSuccess={mutationRefresh} peers={taildropPeers} />}
                    icon={Icon.Upload}
                  />
                ) : null}
                <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
          <List.Item
            id="taildrop-receive"
            title="Receive Files"
            subtitle="Move files out of your Taildrop inbox"
            icon={Icon.Download}
            detail={
              <List.Item.Detail markdown="# Taildrop Receive\n\nChoose a destination folder and conflict policy." />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Receive Taildrop Files"
                  target={<ReceiveFilesForm client={client} onSuccess={mutationRefresh} />}
                  icon={Icon.Download}
                />
                <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {data && peers.length > 0 ? (
        <List.Section title={`Peers (${peers.length})`}>
          {peers.map((peer) => (
            <List.Item
              key={peer.id}
              title={peer.hostName}
              subtitle={peer.os}
              icon={getPeerIcon(peer)}
              accessories={[
                ...(peer.exitNodeOption ? [{ tag: "Exit Node" }] : []),
                ...(peer.noFileSharingReason ? [] : [{ tag: "Taildrop" }]),
                ...(peer.ips[0] ? [{ text: peer.ips[0] }] : []),
              ]}
              detail={<List.Item.Detail markdown={renderPeerDetail(peer)} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Ping Peer" onAction={() => handlePingPeer(peer)} icon={Icon.Bolt} />
                    {!peer.noFileSharingReason ? (
                      <Action.Push
                        title="Send Files to Peer"
                        target={<SendFilesForm client={client} onSuccess={mutationRefresh} peers={[peer]} />}
                        icon={Icon.Upload}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    {peer.ips[0] ? (
                      <Action
                        title="Copy Tailscale IP"
                        onAction={() => copyTextToClipboard(peer.ips[0])}
                        icon={Icon.Clipboard}
                      />
                    ) : null}
                    {peer.dnsName ? (
                      <Action
                        title="Copy MagicDNS Name"
                        onAction={() => copyTextToClipboard(peer.dnsName ?? "")}
                        icon={Icon.Clipboard}
                      />
                    ) : null}
                  </ActionPanel.Section>
                  <ActionPanel.Section title="More">
                    {peer.dnsName ? (
                      <Action
                        title="Open Peer in Browser"
                        onAction={() => open(`http://${peer.dnsName}`)}
                        icon={Icon.Globe}
                      />
                    ) : null}
                    <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {data?.settings ? (
        <List.Section title="Advanced Settings">
          {SETTING_DEFINITIONS.map((setting) => {
            const enabled = data.settings?.[setting.key] ?? false;

            return (
              <List.Item
                key={setting.key}
                title={setting.title}
                subtitle={setting.description}
                icon={getSettingIcon(enabled, setting.icon)}
                accessories={[{ tag: enabled ? "Enabled" : "Disabled" }]}
                detail={
                  <List.Item.Detail
                    markdown={renderAdvancedSettingDetail(setting.title, setting.description, enabled, data.settings)}
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title={`${enabled ? "Disable" : "Enable"} ${setting.title}`}
                      onAction={() => handleToggleSetting(setting.key, !enabled)}
                      icon={enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    />
                    <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      {data ? (
        <List.Section title="Serve & Funnel">
          {[data.serveStatus, data.funnelStatus].filter(Boolean).map((serviceStatus) => (
            <List.Item
              key={serviceStatus?.kind}
              title={serviceStatus?.kind === "serve" ? "Serve" : "Funnel"}
              subtitle={serviceStatus?.summary}
              icon={getServiceIcon(serviceStatus)}
              accessories={serviceStatus?.enabled ? [{ tag: "Configured" }] : [{ tag: "Not Configured" }]}
              detail={<List.Item.Detail markdown={renderServiceStatusDetail(serviceStatus)} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={`Configure ${serviceStatus?.kind === "serve" ? "Serve" : "Funnel"}`}
                    target={
                      <ConfigureServiceForm
                        client={client}
                        onSuccess={mutationRefresh}
                        kind={serviceStatus?.kind ?? "serve"}
                      />
                    }
                    icon={Icon.Pencil}
                  />
                  {serviceStatus?.enabled ? (
                    <Action
                      title={`Reset ${serviceStatus?.kind === "serve" ? "Serve" : "Funnel"}`}
                      onAction={() => handleResetService(serviceStatus.kind)}
                      icon={Icon.Trash}
                    />
                  ) : null}
                  {serviceStatus?.host ? (
                    <Action.OpenInBrowser
                      title={`Open ${serviceStatus.kind === "serve" ? "Serve" : "Funnel"} URL`}
                      url={`https://${serviceStatus.host}${serviceStatus.path ?? ""}`}
                    />
                  ) : null}
                  <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {data ? (
        <List.Section title="Diagnostics">
          <List.Item
            id="netcheck"
            title="Netcheck"
            subtitle={netcheck?.summary}
            icon={Icon.Wifi}
            detail={<List.Item.Detail markdown={renderNetcheckDetail(netcheck)} />}
            actions={
              <ActionPanel>
                <Action title="Run Netcheck" onAction={handleNetcheck} icon={Icon.Wifi} />
                <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
              </ActionPanel>
            }
          />
          {data.health.map((message) => (
            <List.Item
              key={message.id}
              title={message.text}
              icon={getHealthIcon(message.level)}
              detail={<List.Item.Detail markdown={`# Health Message\n\n${message.text}`} />}
              actions={
                <ActionPanel>
                  <Action title="Refresh" onAction={refresh} icon={Icon.ArrowClockwise} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
