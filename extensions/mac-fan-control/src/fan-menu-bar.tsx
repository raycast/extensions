import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  launchCommand,
  showHUD,
  showToast,
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
  // Failures are reported inside the menu; without this the default failure toast
  // would reappear on every `interval` tick while the core is missing.
  const { data, isLoading, error, revalidate } = useCachedPromise(
    readStatus,
    [true],
    {
      onError: () => {
        // Shown inline below instead.
      },
    },
  );
  const fans = data?.fans ?? [];
  const fastest = fans.reduce(
    (highest, fan) => Math.max(highest, fan.actual),
    0,
  );
  const current = fans.length ? mode(fans) : "";

  async function apply(action: () => Promise<string>, confirmation: string) {
    try {
      await action();
      await showHUD(confirmation);
      revalidate();
    } catch (failure) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: (failure as Error).message,
      });
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: Icon.Gauge,
        tintColor: error
          ? Color.Red
          : current === "Forced"
            ? Color.Blue
            : Color.PrimaryText,
      }}
      title={fans.length ? String(Math.round(fastest)) : undefined}
      tooltip={
        error
          ? error.message
          : fans.length
            ? `${current} · ${Math.round(average(fans))}%`
            : "Fan Control"
      }
    >
      {error ? (
        <MenuBarExtra.Section title="Fan Control Unavailable">
          <MenuBarExtra.Item
            title={error.message}
            icon={Icon.ExclamationMark}
          />
        </MenuBarExtra.Section>
      ) : null}
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
          onAction={() => apply(() => setPercent(100), "Fans at maximum")}
        />
        <MenuBarExtra.Item
          title="Restore Automatic"
          icon={Icon.Repeat}
          onAction={() => apply(setAutomatic, "Fans on automatic")}
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
