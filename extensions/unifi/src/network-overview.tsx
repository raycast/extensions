import { Action, ActionPanel, Color, Icon, LaunchType, List } from "@raycast/api";
import { useCallback } from "react";
import { getSelectedSite } from "./api/preferences";
import { MissingSite } from "./components/states";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import { findUniFiProblems, summarizeUniFiHealth, type UniFiProblem } from "./lib/health";
import { launchUniFiCommand } from "./lib/launch-command";
import {
  OVERVIEW_RESOURCE_TARGETS,
  protectProblemContext,
  type ResourceCommandTarget,
} from "./lib/resource-navigation";

interface CommandTarget {
  context?: ResourceCommandTarget["context"];
  name: string;
  title: string;
}

function OpenCommandAction({ context, name, title }: CommandTarget) {
  return (
    <Action
      title={title}
      icon={Icon.Sidebar}
      onAction={() =>
        launchUniFiCommand({ context, name, type: LaunchType.UserInitiated }, `Could not open ${title.toLowerCase()}`)
      }
    />
  );
}

function actions(targets: CommandTarget | CommandTarget[], refresh: () => void) {
  const commands = Array.isArray(targets) ? targets : [targets];
  return (
    <ActionPanel>
      {commands.map((target) => (
        <OpenCommandAction key={`${target.name}-${target.title}`} {...target} />
      ))}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
    </ActionPanel>
  );
}

function ProblemList({
  problems,
  unavailable,
  refresh,
}: {
  problems: UniFiProblem[];
  unavailable: string[];
  refresh: () => void;
}) {
  const openProblem = (problem: UniFiProblem) => {
    const options =
      problem.service === "network"
        ? {
            arguments: { search: problem.entityId },
            name: "view-devices",
            type: LaunchType.UserInitiated,
          }
        : {
            context: protectProblemContext(problem.resource, problem.entityId),
            name: "browse-protect",
            type: LaunchType.UserInitiated,
          };
    launchUniFiCommand(options, "Could not open the UniFi resource");
  };

  return (
    <List filtering isShowingDetail navigationTitle="UniFi Problems" searchBarPlaceholder="Search problems">
      <List.Section title="Needs Attention" subtitle={`${problems.length}`}>
        {problems.map((problem) => (
          <List.Item
            key={`${problem.kind}-${problem.resource}-${problem.entityId}`}
            title={problem.name}
            subtitle={problem.message}
            icon={{
              source: problem.kind === "firmware-update" ? Icon.Download : Icon.Warning,
              tintColor: problem.kind === "firmware-update" ? Color.Blue : Color.Orange,
            }}
            accessories={[{ tag: { value: problem.service === "network" ? "Network" : "Protect" } }]}
            keywords={[problem.entityId, problem.resource, problem.kind, problem.state ?? ""]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Problem" text={problem.message} />
                    <List.Item.Detail.Metadata.Label title="Application" text={problem.service} />
                    <List.Item.Detail.Metadata.Label title="Resource" text={problem.resource} />
                    <List.Item.Detail.Metadata.Label title="State" text={problem.state} />
                    <List.Item.Detail.Metadata.Label title="ID" text={problem.entityId} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={problem.service === "network" ? "Open Device" : "Open Protect Resource"}
                  icon={problem.service === "network" ? Icon.HardDrive : Icon.Camera}
                  onAction={() => openProblem(problem)}
                />
                <Action.CopyToClipboard title="Copy ID" content={problem.entityId} />
                <Action title="Refresh Overview" icon={Icon.ArrowClockwise} onAction={refresh} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {unavailable.length ? (
        <List.Section title="Unavailable" subtitle={`${unavailable.length}`}>
          {unavailable.map((message, index) => (
            <List.Item
              key={`${message}-${index}`}
              title={message}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
            />
          ))}
        </List.Section>
      ) : null}
      {!problems.length && !unavailable.length ? (
        <List.EmptyView title="No current issues" icon={{ source: Icon.Checkmark, tintColor: Color.Green }} />
      ) : null}
    </List>
  );
}

export default function UniFiOverview() {
  const client = useUniFiClient();
  const siteLoad = useCallback(() => getSelectedSite(), []);
  const { data: site, isLoading: siteIsLoading } = useAsyncResource(siteLoad);
  const overviewLoad = useCallback(async () => {
    if (!site) return undefined;
    const [network, protect] = await Promise.allSettled([client.getNetworkOverview(site), client.getProtectOverview()]);
    return {
      network: network.status === "fulfilled" ? network.value : undefined,
      networkError: network.status === "rejected" ? network.reason : undefined,
      protect: protect.status === "fulfilled" ? protect.value : undefined,
      protectError: protect.status === "rejected" ? protect.reason : undefined,
    };
  }, [client, site]);
  const { data, isLoading, revalidate } = useAsyncResource(overviewLoad);

  if (!site && !siteIsLoading) return <MissingSite />;

  const network = data?.network;
  const protect = data?.protect;
  const health = summarizeUniFiHealth(network, protect);
  const problems = findUniFiProblems(network, protect);
  const unavailable = [
    ...(data?.networkError
      ? [data.networkError instanceof Error ? data.networkError.message : "Network unavailable"]
      : []),
    ...(data?.protectError
      ? [data.protectError instanceof Error ? data.protectError.message : "Protect unavailable"]
      : []),
    ...(network?.unavailable.map(({ reason, resource }) => `${resource}: ${reason}`) ?? []),
    ...(protect?.unavailable.map(({ reason, resource }) => `${resource}: ${reason}`) ?? []),
  ];
  const healthTitle =
    !data && isLoading
      ? "Checking Network and Protect…"
      : health.issueCount > 0
        ? `${health.issueCount} items need attention`
        : unavailable.length > 0
          ? "No issues in available data"
          : "No current issues";

  return (
    <List isLoading={isLoading || siteIsLoading} isShowingDetail>
      <List.Section title="Health">
        <List.Item
          title={healthTitle}
          icon={{
            source: health.issueCount === 0 ? Icon.Checkmark : Icon.Warning,
            tintColor: health.issueCount === 0 ? Color.Green : Color.Orange,
          }}
          accessories={
            unavailable.length ? [{ tag: { value: `${unavailable.length} unavailable`, color: Color.Orange } }] : []
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Network devices not online"
                    text={`${health.network.devicesOffline}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Firmware updates"
                    text={`${health.network.firmwareUpdates}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Protect devices not connected"
                    text={`${health.protect.devicesOffline}`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Low sensor batteries"
                    text={`${health.protect.sensorBatteriesLow}`}
                  />
                  <List.Item.Detail.Metadata.Label title="Unavailable API groups" text={`${unavailable.length}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Problems"
                icon={Icon.Warning}
                target={<ProblemList problems={problems} unavailable={unavailable} refresh={revalidate} />}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Network">
        <List.Item
          title="Devices"
          icon="unifi.png"
          accessories={[
            {
              tag: {
                value: `${health.network.devices - health.network.devicesOffline} online`,
                color: health.network.devicesOffline ? Color.Orange : Color.Green,
              },
            },
            ...(health.network.devicesOffline
              ? [{ tag: { value: `${health.network.devicesOffline} not online`, color: Color.Red } }]
              : []),
            ...(health.network.firmwareUpdates
              ? [{ tag: { value: `${health.network.firmwareUpdates} updates`, color: Color.Orange } }]
              : []),
          ]}
          actions={actions({ name: "view-devices", title: "Search Devices" }, revalidate)}
        />
        <List.Item
          title="Connected Clients"
          icon={{ source: Icon.Person, tintColor: Color.Blue }}
          accessories={[{ tag: { value: `${health.network.clients}` } }]}
          actions={actions({ name: "view-clients", title: "Search Clients" }, revalidate)}
        />
        <List.Item
          title="Networks and Wi-Fi"
          icon={Icon.Network}
          accessories={[
            { text: `${health.network.networks} networks` },
            { text: `${health.network.wifi - health.network.wifiDisabled}/${health.network.wifi} Wi-Fi enabled` },
          ]}
          actions={actions(OVERVIEW_RESOURCE_TARGETS.networksAndWifi, revalidate)}
        />
        <List.Item
          title="WAN and Firewall"
          icon={Icon.Shield}
          accessories={[
            { text: `${health.network.wans} WAN` },
            { text: `${health.network.firewallPolicies} policies` },
          ]}
          actions={actions(OVERVIEW_RESOURCE_TARGETS.wanAndFirewall, revalidate)}
        />
      </List.Section>

      <List.Section title="Protect">
        <List.Item
          title="Cameras"
          icon={Icon.Camera}
          accessories={[
            {
              tag: {
                value: `${health.protect.cameras - health.protect.camerasOffline} connected`,
                color: health.protect.camerasOffline ? Color.Orange : Color.Green,
              },
            },
            ...(health.protect.camerasOffline
              ? [{ tag: { value: `${health.protect.camerasOffline} disconnected`, color: Color.Red } }]
              : []),
          ]}
          actions={actions(OVERVIEW_RESOURCE_TARGETS.cameras, revalidate)}
        />
        <List.Item
          title="Sensors"
          icon={Icon.Gauge}
          accessories={[
            { text: `${health.protect.sensors} total` },
            ...(health.protect.sensorsOpen
              ? [{ tag: { value: `${health.protect.sensorsOpen} open`, color: Color.Orange } }]
              : []),
            ...(health.protect.sensorBatteriesLow
              ? [{ tag: { value: `${health.protect.sensorBatteriesLow} low battery`, color: Color.Red } }]
              : []),
          ]}
          actions={actions(OVERVIEW_RESOURCE_TARGETS.sensors, revalidate)}
        />
        <List.Item
          title="Alarm Mode"
          icon={Icon.Lock}
          accessories={[{ tag: { value: health.protect.alarmStatus } }]}
          actions={actions(OVERVIEW_RESOURCE_TARGETS.alarmMode, revalidate)}
        />
      </List.Section>

      {unavailable.length ? (
        <List.Section title="Unavailable">
          {unavailable.map((message, index) => (
            <List.Item
              key={`${message}-${index}`}
              title={message}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
