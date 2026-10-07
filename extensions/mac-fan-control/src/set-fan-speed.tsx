import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  average,
  estimate,
  mode,
  readStatus,
  rpm,
  setAutomatic,
  setPercent,
} from "macos-fan-control-client";

const PRESETS = [100, 85, 70, 55, 40, 25, 0];
const CONFIRM_BELOW = 50;

const label = (percent: number) =>
  percent === 100 ? "Maximum" : percent === 0 ? "Minimum" : `${percent}%`;

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(readStatus, [false]);
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
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = (error as Error).message;
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
    <List
      isLoading={isLoading}
      navigationTitle={
        fans.length ? `${current} · ${currentPercent}%` : "Fan Control"
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
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => apply(setAutomatic, "Fans on automatic")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
