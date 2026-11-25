import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  average,
  estimate,
  mode,
  readStatus,
  rpm,
  setAutomatic,
  setPercent,
} from "macos-fan-control-client";
import { needsSetup } from "./install";
import { openCommand } from "./launch";

const PRESETS = [100, 85, 70, 55, 40, 25, 0];
const CONFIRM_BELOW = 50;

const label = (percent: number) =>
  percent === 100 ? "Maximum" : percent === 0 ? "Minimum" : `${percent}%`;

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(readStatus, [
    false,
  ]);
  const fans = data?.fans ?? [];
  const current = fans.length ? mode(fans) : "";
  const currentPercent = Math.round(average(fans));

  async function apply(action: () => Promise<string>, title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await action();
      toast.style = Toast.Style.Success;
      toast.title = title;
      revalidate();
    } catch (error) {
      await toast.hide();
      showFailureToast(error, { title: "Failed" });
    }
  }

  async function force(percent: number) {
    if (percent < CONFIRM_BELOW) {
      const ok = await confirmAlert({
        title: `Force fans to ${label(percent).toLowerCase()}?`,
        message:
          "The SMC will not override a forced target, so this reduces cooling.",
        primaryAction: { title: "Force", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }
    await apply(
      () => setPercent(percent),
      `Fans at ${label(percent).toLowerCase()}`,
    );
  }

  return (
    <List isLoading={isLoading}>
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Fan Control Unavailable"
          description={error.message}
          actions={
            <ActionPanel>
              {needsSetup(error) ? (
                <Action
                  title="Set up Fan Control…"
                  icon={Icon.Download}
                  onAction={() =>
                    openCommand(
                      "fan-control-setup",
                      "Could not open Set Up Fan Control",
                    )
                  }
                />
              ) : null}
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {/* Set Fan Speed is a root command, so the bottom bar shows its own title;
          the current mode and speed live here instead. */}
      <List.Section
        title={
          fans.length
            ? `Current: ${current} · ${currentPercent}%`
            : "Fan Control"
        }
      >
        <List.Item
          icon={{ source: Icon.Repeat, tintColor: Color.Green }}
          title="Automatic"
          subtitle="Firmware decides"
          accessories={
            current === "Auto"
              ? [{ tag: { value: "Active", color: Color.Green } }]
              : []
          }
          actions={
            <ActionPanel>
              <Action
                title="Restore Automatic"
                icon={Icon.Repeat}
                onAction={() => apply(setAutomatic, "Fans on automatic")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Force speed">
        {PRESETS.map((percent) => (
          <List.Item
            key={percent}
            icon={{
              source: percent === 100 ? Icon.Bolt : Icon.Gauge,
              tintColor: percent < CONFIRM_BELOW ? Color.Orange : Color.Blue,
            }}
            title={label(percent)}
            subtitle={fans
              .map((fan) => rpm(estimate(fan, percent)))
              .join("  ·  ")}
            accessories={
              current === "Forced" && currentPercent === percent
                ? [{ tag: { value: "Active", color: Color.Blue } }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Force ${label(percent)}`}
                  icon={Icon.Bolt}
                  onAction={() => force(percent)}
                />
                <Action
                  title="Restore Automatic"
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={() => apply(setAutomatic, "Fans on automatic")}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
