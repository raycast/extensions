import { Icon, LaunchType, MenuBarExtra, launchCommand } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  batteryPowerWatts,
  formatAmps,
  formatVolts,
  getPowerInfo,
} from "./power";

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(getPowerInfo);

  const connected = data?.connected ?? false;
  const watts = data?.adapter.watts;
  const batteryWatts = data ? batteryPowerWatts(data.battery) : undefined;

  const percent = data?.battery.percent;

  // Plugged in: show negotiated charger wattage. On battery: show charge level.
  const title = !data
    ? ""
    : connected && watts !== undefined
      ? `${watts} W`
      : percent !== undefined
        ? `${percent}%`
        : "";
  const icon = connected ? Icon.Bolt : Icon.Battery;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={icon}
      title={title}
      tooltip={
        connected ? "Watt's Up – charger power" : "Watt's Up – battery charge"
      }
    >
      {data && (
        <>
          <MenuBarExtra.Section title="Charger">
            {connected ? (
              <>
                <MenuBarExtra.Item
                  icon={Icon.Bolt}
                  title={`Negotiated: ${watts !== undefined ? `${watts} W` : "unknown"}`}
                  subtitle={data.adapter.description}
                  onAction={revalidate}
                />
                <MenuBarExtra.Item
                  icon={Icon.Plug}
                  title={`${formatVolts(data.adapter.voltageMv) ?? "–"} × ${formatAmps(data.adapter.currentMa) ?? "–"}`}
                  onAction={revalidate}
                />
              </>
            ) : (
              <MenuBarExtra.Item
                icon={Icon.Battery}
                title="No charger connected"
                onAction={revalidate}
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section title="Battery">
            <MenuBarExtra.Item
              icon={Icon.Battery}
              title={`Charge: ${data.battery.percent ?? "–"}%${data.fullyCharged ? " (full)" : data.charging ? " (charging)" : ""}`}
              onAction={revalidate}
            />
            {batteryWatts !== undefined && (
              <MenuBarExtra.Item
                icon={Icon.Gauge}
                title={`Battery flow: ${batteryWatts.toFixed(1)} W`}
                onAction={revalidate}
              />
            )}
          </MenuBarExtra.Section>
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              icon={Icon.ArrowClockwise}
              title="Refresh"
              onAction={revalidate}
            />
            <MenuBarExtra.Item
              icon={Icon.RaycastLogoNeg}
              title="Open Power and Charger Info"
              onAction={() =>
                launchCommand({ name: "index", type: LaunchType.UserInitiated })
              }
            />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
