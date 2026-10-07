import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  average,
  mode,
  readStatus,
  rpm,
  setAutomatic,
  setPercent,
} from "macos-fan-control-client";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(readStatus, [true]);
  const fans = data?.fans ?? [];
  const fastest = fans.reduce(
    (highest, fan) => Math.max(highest, fan.actual),
    0,
  );
  const current = fans.length ? mode(fans) : "";

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Gauge,
        tintColor: current === "Forced" ? Color.Blue : Color.PrimaryText,
      }}
      title={fans.length ? String(Math.round(fastest)) : undefined}
      tooltip={
        fans.length
          ? `${current} · ${Math.round(average(fans))}%`
          : "Fan Control"
      }
    >
      <MenuBarExtra.Section title={current}>
        {fans.map((fan) => (
          <MenuBarExtra.Item
            key={fan.index}
            title={`Fan ${fan.index}`}
            subtitle={`${rpm(fan.actual)} · ${Math.round(fan.percent)}%`}
          />
        ))}
      </MenuBarExtra.Section>
      {data?.temperatures ? (
        <MenuBarExtra.Section title="Temperature">
          <MenuBarExtra.Item
            title="CPU"
            subtitle={`${data.temperatures.cpu.toFixed(1)} °C`}
          />
          <MenuBarExtra.Item
            title="GPU"
            subtitle={`${data.temperatures.gpu.toFixed(1)} °C`}
          />
        </MenuBarExtra.Section>
      ) : null}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Force Maximum"
          icon={Icon.Bolt}
          onAction={async () => {
            await setPercent(100);
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Restore Automatic"
          icon={Icon.Repeat}
          onAction={async () => {
            await setAutomatic();
            revalidate();
          }}
        />
        <MenuBarExtra.Item
          title="Set Fan Speed…"
          icon={Icon.Gauge}
          onAction={() =>
            launchCommand({
              name: "set-fan-speed",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
