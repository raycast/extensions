import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  batteryPowerWatts,
  formatAmps,
  formatVolts,
  getPowerInfo,
} from "./power";
import { getPowerProfile, getThermalState } from "./profiler";

export default function Command() {
  const {
    data,
    isLoading,
    revalidate: revalidatePower,
  } = usePromise(getPowerInfo);
  const profile = usePromise(getPowerProfile);
  const thermal = usePromise(getThermalState);

  const revalidate = () => {
    revalidatePower();
    profile.revalidate();
    thermal.revalidate();
  };

  const adapter = data?.adapter;
  const battery = data?.battery;
  const batteryWatts = battery ? batteryPowerWatts(battery) : undefined;

  const chargingState = !data
    ? undefined
    : !data.connected
      ? { text: "On Battery", icon: Icon.Battery, color: Color.SecondaryText }
      : data.charging
        ? { text: "Charging", icon: Icon.BatteryCharging, color: Color.Green }
        : data.fullyCharged
          ? { text: "Fully Charged", icon: Icon.Battery, color: Color.Green }
          : {
              text: "Connected, Not Charging",
              icon: Icon.Plug,
              color: Color.Yellow,
            };

  const health =
    battery?.rawMaxCapacity !== undefined && battery.designCapacity
      ? Math.round((battery.rawMaxCapacity / battery.designCapacity) * 100)
      : undefined;

  return (
    <List isLoading={isLoading}>
      <List.Section title="Charger">
        {data && !data.connected ? (
          <List.Item
            icon={Icon.Battery}
            title="No Charger Connected"
            subtitle="Running on battery power"
          />
        ) : (
          <>
            <List.Item
              icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
              title="Negotiated Power"
              subtitle={adapter?.description}
              accessories={[
                {
                  tag: {
                    value:
                      adapter?.watts !== undefined ? `${adapter.watts} W` : "–",
                    color: Color.Yellow,
                  },
                },
              ]}
              actions={
                <Actions
                  revalidate={revalidate}
                  copyValue={adapter?.watts?.toString()}
                />
              }
            />
            <List.Item
              icon={Icon.Plug}
              title="Voltage × Current"
              accessories={[
                {
                  text: `${formatVolts(adapter?.voltageMv) ?? "–"} × ${formatAmps(adapter?.currentMa) ?? "–"}`,
                },
              ]}
              actions={<Actions revalidate={revalidate} />}
            />
            {chargingState && (
              <List.Item
                icon={{
                  source: chargingState.icon,
                  tintColor: chargingState.color,
                }}
                title="Status"
                accessories={[{ text: chargingState.text }]}
                actions={<Actions revalidate={revalidate} />}
              />
            )}
            {profile.data?.charger && (
              <List.Item
                icon={Icon.Info}
                title="Charger Identity"
                subtitle={
                  profile.data.charger.isIdentified
                    ? [
                        profile.data.charger.manufacturer,
                        profile.data.charger.serialNumber,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "not reported (typically third-party)"
                }
                accessories={[
                  {
                    text: profile.data.charger.isIdentified
                      ? profile.data.charger.name
                      : "Unidentified",
                  },
                ]}
                actions={<Actions revalidate={revalidate} />}
              />
            )}
          </>
        )}
      </List.Section>
      <List.Section title="Battery">
        <List.Item
          icon={Icon.Battery}
          title="Charge Level"
          accessories={[
            {
              text:
                battery?.percent !== undefined ? `${battery.percent}%` : "–",
            },
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.Gauge}
          title="Battery Power Flow"
          subtitle="positive = charging, negative = discharging"
          accessories={[
            {
              text:
                batteryWatts !== undefined
                  ? `${batteryWatts.toFixed(1)} W`
                  : "–",
            },
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.Heart}
          title="Health"
          subtitle={
            battery?.rawMaxCapacity !== undefined &&
            battery?.designCapacity !== undefined
              ? `${battery.rawMaxCapacity} / ${battery.designCapacity} mAh`
              : undefined
          }
          accessories={[{ text: health !== undefined ? `${health}%` : "–" }]}
          actions={<Actions revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.Checkmark}
          title="Condition"
          subtitle={
            profile.data?.battery.optimizedCharging !== undefined
              ? `optimized charging: ${profile.data.battery.optimizedCharging.toLowerCase()}`
              : "Apple's verdict + reported max capacity"
          }
          accessories={[
            { text: profile.data?.battery.condition ?? "–" },
            ...(profile.data?.battery.maxCapacityPercent !== undefined
              ? [{ text: `${profile.data.battery.maxCapacityPercent}%` }]
              : []),
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.ArrowClockwise}
          title="Cycle Count"
          accessories={[{ text: battery?.cycleCount?.toString() ?? "–" }]}
          actions={<Actions revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.Temperature}
          title="Temperature"
          accessories={[
            {
              text:
                battery?.temperature !== undefined
                  ? `${battery.temperature.toFixed(1)} °C`
                  : "–",
            },
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
        {battery?.cellVoltagesMv && battery.cellVoltagesMv.length > 0 && (
          <List.Item
            icon={Icon.BarChart}
            title="Cell Voltages"
            accessories={[
              {
                text: battery.cellVoltagesMv
                  .map((mv) => (mv / 1000).toFixed(3))
                  .join(" / ")
                  .concat(" V"),
              },
            ]}
            actions={<Actions revalidate={revalidate} />}
          />
        )}
        <List.Item
          icon={Icon.Bolt}
          title="Instant Amperage"
          subtitle="negative = discharging"
          accessories={[
            {
              text:
                battery?.instantAmperageMa !== undefined
                  ? `${battery.instantAmperageMa} mA`
                  : "–",
            },
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
      </List.Section>
      <List.Section title="Thermal">
        <List.Item
          icon={{
            source: Icon.Temperature,
            tintColor: thermal.data?.throttled ? Color.Red : Color.Green,
          }}
          title="CPU Throttling"
          subtitle={
            thermal.data?.throttled
              ? `CPU limited to ${thermal.data.cpuSpeedLimit}% by heat`
              : undefined
          }
          accessories={[
            {
              text: thermal.data
                ? thermal.data.throttled
                  ? `${thermal.data.cpuSpeedLimit}% speed limit`
                  : "None"
                : "–",
            },
          ]}
          actions={<Actions revalidate={revalidate} />}
        />
      </List.Section>
    </List>
  );
}

function Actions({
  revalidate,
  copyValue,
}: {
  revalidate: () => void;
  copyValue?: string;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      {copyValue && (
        <Action.CopyToClipboard title="Copy Wattage" content={copyValue} />
      )}
    </ActionPanel>
  );
}
