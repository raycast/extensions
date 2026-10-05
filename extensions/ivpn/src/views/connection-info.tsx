import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Environment,
  Icon,
  PopToRootType,
  Toast,
  closeMainWindow,
  environment,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

import { IvpnInfoParsed } from "@/api/ivpn/types";
import { IvpnStatusExtended, UseIvpnConnectionOptions, useIvpnConnection } from "@/contexts/IvpnConnectionContext";
import { getFlagIcon } from "@/utils/flags";

type ConnectionInfoProps = {
  initialTrigger?: (...args: Parameters<NonNullable<UseIvpnConnectionOptions["onInit"]>>) => Promise<void>;
};

export function ConnectionInfo({ initialTrigger }: ConnectionInfoProps) {
  const [initialTriggerOngoing, setInitialTriggerOngoing] = useState(!!initialTrigger);

  const { info, isGettingInfo, revalidateInfo, connect, disconnect, switchingState } = useIvpnConnection({
    onInit: initialTrigger
      ? async (ctx) => {
          await initialTrigger(ctx);
          setInitialTriggerOngoing(false);
        }
      : undefined,
  });

  if (!info || initialTriggerOngoing) {
    return (
      <Detail
        isLoading={true}
        markdown={switchingState ? formatMarkdown(switchingState) : null}
        metadata={
          switchingState ? (
            <Detail.Metadata>
              <Detail.Metadata.Label title="Pending..." />
            </Detail.Metadata>
          ) : null
        }
      />
    );
  }

  async function handleConnect() {
    showToast({
      title: "Connecting...",
      style: Toast.Style.Animated,
    });
    await connect();
    showToast({ title: "Connected" });
  }

  async function handleDisconnect() {
    showToast({
      title: "Disconnecting...",
      style: Toast.Style.Animated,
    });
    await disconnect();
    showToast({ title: "Disconnected" });
  }

  const status = switchingState ?? info.vpnStatusSimplified;

  let toggleAction;
  if (status === "CONNECTED") {
    toggleAction = (
      <Action
        title="Disconnect"
        icon={Icon.LivestreamDisabled}
        onAction={handleDisconnect}
        shortcut={{ key: "enter", modifiers: ["opt"] }}
        style={Action.Style.Destructive}
      />
    );
  } else if (status === "DISCONNECTED") {
    toggleAction = (
      <Action
        title="Connect"
        icon={Icon.Livestream}
        onAction={handleConnect}
        shortcut={{ key: "enter", modifiers: ["opt"] }}
      />
    );
  }

  let reloadAction;
  if (status !== "CONNECTING" && status !== "DISCONNECTING") {
    reloadAction = (
      <Action
        title="Refresh"
        icon={Icon.RotateClockwise}
        onAction={async () => {
          await revalidateInfo();
          showToast({ title: "Refreshed" });
        }}
        shortcut={{ key: "r", modifiers: ["cmd"] }}
      />
    );
  }

  if (info.vpnStatusSimplified === "ERROR") {
    showFailureToast(info.error, {
      primaryAction: { title: "Copy Output to Clipboard", onAction: () => Clipboard.copy(info.error.message) },
    });
  }

  return (
    <Detail
      isLoading={status === "CONNECTING" || status === "DISCONNECTING" || isGettingInfo}
      markdown={formatMarkdown(status)}
      metadata={<IvpnMetadata info={info} status={status} />}
      actions={
        <ActionPanel>
          <Action
            title="Dismiss"
            icon={Icon.ThumbsUp}
            onAction={() => closeMainWindow({ popToRootType: PopToRootType.Immediate })}
          />
          {reloadAction}
          {toggleAction}
        </ActionPanel>
      }
    />
  );
}

function IvpnMetadata({ info, status }: { info: IvpnInfoParsed; status: IvpnStatusExtended }) {
  if (info.vpnStatusSimplified === "ERROR") {
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Data Not Available" />
      </Detail.Metadata>
    );
  }

  if (status === "CONNECTING" || status === "DISCONNECTING")
    return (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Pending..." />
      </Detail.Metadata>
    );

  if (info.vpnStatusSimplified === "CONNECTING") throw new Error("This can't happen, just making TypeScript happy...");

  const firewallDetails = (
    <Detail.Metadata.TagList title="Firewall">
      <Detail.Metadata.TagList.Item
        text={info.firewall.enabled ? "Enabled" : "Disabled"}
        color={info.firewall.enabled ? Color.Green : Color.Red}
      />
      <Detail.Metadata.TagList.Item
        text={info.firewall.allowLan ? "LAN Allowed" : "LAN Not Allowed"}
        color={info.firewall.allowLan ? Color.Green : Color.Red}
      />
      <Detail.Metadata.TagList.Item
        text={info.firewall.allowIvpnServers ? "IVPN Servers Allowed" : "IVPN Servers Not Allowed"}
        color={info.firewall.allowIvpnServers ? Color.Green : Color.Red}
      />
    </Detail.Metadata.TagList>
  );

  if (status === "DISCONNECTED") return <Detail.Metadata>{firewallDetails}</Detail.Metadata>;

  if (info.vpnStatus !== "CONNECTED") throw new Error("This can't happen, just making TypeScript happy...");

  const connectedSince = Intl.DateTimeFormat("us", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(info.connectedSince);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label
        title="Location"
        text={`${info.serverLocation.city}, ${info.serverLocation.country}`}
        icon={getFlagIcon(info.serverLocation.countryCode)}
      />
      <Detail.Metadata.Label title="Connected Since" text={connectedSince} />

      <Detail.Metadata.Separator />

      {firewallDetails}

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="VPN Protocol" text={info.protocol} />
      {info.obfuscation ? <Detail.Metadata.Label title="Obfuscation" text={info.obfuscation} /> : null}
      <Detail.Metadata.Label title="Server Protocol & Port" text={`${info.serverProtocol} ${info.serverPort}`} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Server Hostname" text={info.serverHostname} />
      <Detail.Metadata.Label title="Server Endpoint" text={info.serverEndpoint} />
      <Detail.Metadata.Label title="Server IP" text={info.serverIp} />
      <Detail.Metadata.Label title="Local IP" text={info.localIp} />
      <Detail.Metadata.Label title="DNS" text={info.dns} />
    </Detail.Metadata>
  );
}

function formatMarkdown(status: IvpnStatusExtended) {
  const statusMessages = {
    CONNECTED: {
      title: "IVPN Connected",
      subtitle: "Your internet connection is private and secure.",
      icon: `status/connected-${environment.appearance}.png`,
    },
    DISCONNECTED: {
      title: "IVPN Disconnected",
      subtitle: "Your connection is not protected. Please reconnect.",
      icon: `status/disconnected-${environment.appearance}.png`,
    },
    CONNECTING: {
      title: "IVPN Connecting...",
      subtitle: "Attempting to establish a secure connection...",
      icon: `status/pending-${environment.appearance}.png`,
    },
    DISCONNECTING: {
      title: "IVPN Disconnecting...",
      subtitle: "Closing existing connection...",
      icon: `status/pending-${environment.appearance}.png`,
    },
    ERROR: {
      title: "Something Went Wrong",
      subtitle: "Couldn't establish a connection",
      icon: `status/error-${environment.appearance}.png`,
    },
  } satisfies Record<IvpnStatusExtended, unknown>;

  const { icon, title, subtitle } = statusMessages[status];

  const iconSizes: Record<Environment["textSize"], number> = { medium: 130, large: 140 };
  const iconSize = iconSizes[environment.textSize];

  // ! pixel.png is just a 1x1 px transparent square
  // ! it's a hacky way i've found to center elements
  const markdown = `
    ![](pixel.png)
    \n![](pixel.png) <img src="${icon}" width="${iconSize}" height="${iconSize}"> ![](pixel.png)
    \n![](pixel.png) **${title}** ![](pixel.png)
    \n![](pixel.png) *${subtitle}* ![](pixel.png)
  `;

  return markdown.trim().replace(/^ {4}/m, "");
}
