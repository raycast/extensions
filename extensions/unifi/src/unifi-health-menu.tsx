import { Color, Icon, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCallback } from "react";
import { getSelectedSite } from "./api/preferences";
import { useAsyncResource } from "./hooks/use-async-resource";
import { useUniFiClient } from "./hooks/use-unifi";
import { summarizeUniFiHealth } from "./lib/health";
import { launchUniFiCommand } from "./lib/launch-command";

function openCommand(name: string): void {
  launchUniFiCommand({ name, type: LaunchType.UserInitiated }, "Could not open the UniFi command");
}

export default function UniFiHealthMenu() {
  const client = useUniFiClient();
  const siteLoad = useCallback(() => getSelectedSite(), []);
  const { data: site, isLoading: siteIsLoading } = useAsyncResource(siteLoad);
  const healthLoad = useCallback(async () => {
    if (!site) return undefined;
    const [network, protect] = await Promise.allSettled([client.getNetworkOverview(site), client.getProtectOverview()]);
    return {
      network: network.status === "fulfilled" ? network.value : undefined,
      networkError: network.status === "rejected" ? network.reason : undefined,
      protect: protect.status === "fulfilled" ? protect.value : undefined,
      protectError: protect.status === "rejected" ? protect.reason : undefined,
    };
  }, [client, site]);
  const { data, isLoading } = useAsyncResource(healthLoad);
  const health = summarizeUniFiHealth(data?.network, data?.protect);
  const unavailableCount =
    Number(Boolean(data?.networkError)) +
    Number(Boolean(data?.protectError)) +
    (data?.network?.unavailable.length ?? 0) +
    (data?.protect?.unavailable.length ?? 0);
  const loading = siteIsLoading || isLoading;
  const hasWarning = health.issueCount > 0 || unavailableCount > 0 || (!site && !loading);
  const title = loading
    ? undefined
    : health.issueCount > 0
      ? `${health.issueCount}`
      : unavailableCount > 0 || !site
        ? "!"
        : undefined;
  const tooltip = !site
    ? "UniFi health: select a Network site"
    : loading
      ? "Checking UniFi health"
      : health.issueCount > 0
        ? `UniFi health: ${health.issueCount} items need attention`
        : unavailableCount > 0
          ? "UniFi health is incomplete"
          : "UniFi health: no current issues";

  return (
    <MenuBarExtra
      icon={{ source: hasWarning ? Icon.Warning : Icon.Checkmark, tintColor: hasWarning ? Color.Orange : Color.Green }}
      isLoading={loading}
      title={title}
      tooltip={tooltip}
    >
      {!site && !loading ? (
        <MenuBarExtra.Item title="Select a Network Site" icon={Icon.Gear} onAction={() => openCommand("select-site")} />
      ) : (
        <>
          <MenuBarExtra.Section title={site?.name ?? "UniFi"}>
            <MenuBarExtra.Item
              title={
                health.issueCount > 0
                  ? `${health.issueCount} items need attention`
                  : unavailableCount > 0
                    ? "No issues in available data"
                    : "No current issues"
              }
              icon={health.issueCount > 0 ? Icon.Warning : Icon.Checkmark}
            />
            {unavailableCount > 0 ? (
              <MenuBarExtra.Item title={`${unavailableCount} API groups unavailable`} icon={Icon.ExclamationMark} />
            ) : null}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Network">
            <MenuBarExtra.Item
              title={`${health.network.devices - health.network.devicesOffline} devices online`}
              subtitle={health.network.devicesOffline ? `${health.network.devicesOffline} not online` : undefined}
              icon={Icon.HardDrive}
            />
            <MenuBarExtra.Item title={`${health.network.clients} connected clients`} icon={Icon.Person} />
            {health.network.firmwareUpdates > 0 ? (
              <MenuBarExtra.Item title={`${health.network.firmwareUpdates} firmware updates`} icon={Icon.Download} />
            ) : null}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Protect">
            <MenuBarExtra.Item
              title={`${health.protect.cameras - health.protect.camerasOffline} cameras connected`}
              subtitle={health.protect.camerasOffline ? `${health.protect.camerasOffline} disconnected` : undefined}
              icon={Icon.Camera}
            />
            <MenuBarExtra.Item title={`Alarm mode: ${health.protect.alarmStatus}`} icon={Icon.Lock} />
            {health.protect.sensorBatteriesLow > 0 ? (
              <MenuBarExtra.Item
                title={`${health.protect.sensorBatteriesLow} low sensor batteries`}
                icon={Icon.Battery}
              />
            ) : null}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Open UniFi Overview"
              icon={Icon.AppWindowList}
              onAction={() => openCommand("network-overview")}
            />
            <MenuBarExtra.Item
              title="Search Clients"
              icon={Icon.MagnifyingGlass}
              onAction={() => openCommand("view-clients")}
            />
            <MenuBarExtra.Item title="Open Protect" icon={Icon.Camera} onAction={() => openCommand("browse-protect")} />
            <MenuBarExtra.Item
              title="Open Dashboard"
              icon={Icon.Globe}
              onAction={() => openCommand("open-dashboard")}
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
