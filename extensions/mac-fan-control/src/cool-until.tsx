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
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  coolUntil,
  estimate,
  readStatus,
  rpm,
  setAutomatic,
} from "macos-fan-control-client";

// Speeds the cooldown can hold, and the temperatures it releases below. The
// low speeds ask for confirmation because the SMC honours the forced target
// even when its own demand is higher.
const SPEEDS = [100, 85, 70, 55, 40];
const TEMPERATURES = [60, 55, 50, 45, 40];
const CONFIRM_BELOW = 50;

const speedLabel = (percent: number) =>
  percent === 100 ? "Maximum" : `${percent}%`;

export default function Command() {
  const [percent, setPercent] = useState(String(SPEEDS[0]));
  const { data, isLoading, revalidate } = useCachedPromise(readStatus, [false]);
  const fans = data?.fans ?? [];
  const selected = Number(percent);
  const cooling = data?.cooling;

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

  async function cool(temperature: number) {
    if (selected < CONFIRM_BELOW) {
      const ok = await confirmAlert({
        title: `Cool at ${speedLabel(selected).toLowerCase()}?`,
        message:
          "The SMC will not override a forced target, so this reduces cooling.",
        primaryAction: {
          title: "Cool",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!ok) return;
    }
    await apply(
      () => coolUntil(selected, temperature),
      `Cooling until below ${temperature} °C`,
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Speed to hold"
          value={percent}
          onChange={setPercent}
        >
          {SPEEDS.map((value) => (
            <List.Dropdown.Item
              key={value}
              title={speedLabel(value)}
              value={String(value)}
            />
          ))}
        </List.Dropdown>
      }
    >
      {cooling ? (
        <List.Section title="Active cooldown">
          <List.Item
            icon={{ source: Icon.Snowflake, tintColor: Color.Blue }}
            title={`Holding ${speedLabel(cooling.percent)}`}
            subtitle={`until below ${cooling.below} °C`}
            accessories={[{ tag: { value: "Background", color: Color.Blue } }]}
            actions={
              <ActionPanel>
                <Action
                  title="Cancel Cooldown"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={() => apply(setAutomatic, "Fans on automatic")}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section
        title={`Hold ${speedLabel(selected).toLowerCase()} until below`}
      >
        {TEMPERATURES.map((temperature) => (
          <List.Item
            key={temperature}
            icon={{
              source: Icon.Temperature,
              tintColor: temperature <= 45 ? Color.Blue : Color.Orange,
            }}
            title={`${temperature} °C`}
            subtitle={fans
              .map((fan) => rpm(estimate(fan, selected)))
              .join("  ·  ")}
            actions={
              <ActionPanel>
                <Action
                  title={`Cool Until Below ${temperature} °C`}
                  icon={Icon.Snowflake}
                  onAction={() => cool(temperature)}
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
