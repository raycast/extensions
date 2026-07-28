import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  getBatteryStatus,
  getEnergySettings,
  getSleepAssertions,
  setPmsetSetting,
} from "./settings";

export default function Command() {
  const settings = usePromise(getEnergySettings);
  const status = usePromise(getBatteryStatus);
  const assertions = usePromise(getSleepAssertions);

  const revalidate = () => {
    settings.revalidate();
    status.revalidate();
    assertions.revalidate();
  };

  async function toggle(
    key: "lowpowermode" | "powernap",
    title: string,
    current?: boolean,
  ) {
    if (current === undefined) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${current ? "Disabling" : "Enabling"} ${title}…`,
      message: "macOS will ask for your password",
    });
    try {
      await setPmsetSetting(key, current ? 0 : 1);
      toast.style = Toast.Style.Success;
      toast.title = `${title} ${current ? "off" : "on"}`;
      toast.message = undefined;
      revalidate();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = `Could not change ${title}`;
      toast.message = "Password prompt cancelled or pmset failed";
    }
  }

  const onOff = (value?: boolean) =>
    value === undefined
      ? { text: "–" }
      : {
          tag: {
            value: value ? "On" : "Off",
            color: value ? Color.Green : Color.SecondaryText,
          },
        };

  const minutes = (value?: number) =>
    value === undefined ? "–" : value === 0 ? "Never" : `${value} min`;

  return (
    <List
      isLoading={settings.isLoading || status.isLoading || assertions.isLoading}
    >
      <List.Section title="Power">
        <List.Item
          icon={status.data?.source === "AC Power" ? Icon.Plug : Icon.Battery}
          title="Power Source"
          accessories={[
            { text: status.data?.source ?? "–" },
            ...(status.data?.percent !== undefined
              ? [{ text: `${status.data.percent}%` }]
              : []),
            ...(status.data?.timeRemaining
              ? [{ text: `${status.data.timeRemaining} remaining` }]
              : []),
          ]}
          subtitle={status.data?.state}
          actions={<RefreshAction revalidate={revalidate} />}
        />
      </List.Section>
      <List.Section
        title="Settings"
        subtitle="changes require your admin password"
      >
        <List.Item
          icon={{
            source: Icon.BatteryDisabled,
            tintColor: settings.data?.lowPowerMode ? Color.Green : undefined,
          }}
          title="Low Power Mode"
          subtitle="reduces energy usage system-wide"
          accessories={[onOff(settings.data?.lowPowerMode)]}
          actions={
            <ActionPanel>
              <Action
                title={
                  settings.data?.lowPowerMode
                    ? "Turn off Low Power Mode"
                    : "Turn on Low Power Mode"
                }
                icon={Icon.Power}
                onAction={() =>
                  toggle(
                    "lowpowermode",
                    "Low Power Mode",
                    settings.data?.lowPowerMode,
                  )
                }
              />
              <RefreshOnly revalidate={revalidate} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Moon}
          title="Power Nap"
          subtitle="background activity while sleeping"
          accessories={[onOff(settings.data?.powerNap)]}
          actions={
            <ActionPanel>
              <Action
                title={
                  settings.data?.powerNap
                    ? "Turn off Power Nap"
                    : "Turn on Power Nap"
                }
                icon={Icon.Power}
                onAction={() =>
                  toggle("powernap", "Power Nap", settings.data?.powerNap)
                }
              />
              <RefreshOnly revalidate={revalidate} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Monitor}
          title="Display Sleep"
          accessories={[{ text: minutes(settings.data?.displaySleepMin) }]}
          actions={<RefreshAction revalidate={revalidate} />}
        />
        <List.Item
          icon={Icon.Moonrise}
          title="System Sleep"
          accessories={[{ text: minutes(settings.data?.sleepMin) }]}
          actions={<RefreshAction revalidate={revalidate} />}
        />
      </List.Section>
      <List.Section title="Currently Preventing Sleep">
        {assertions.data?.length === 0 && !assertions.isLoading ? (
          <List.Item
            icon={Icon.Checkmark}
            title="Nothing is preventing sleep"
          />
        ) : (
          assertions.data?.map((a, i) => (
            <List.Item
              key={`${a.pid}-${i}`}
              icon={Icon.ExclamationMark}
              title={a.process}
              subtitle={a.reason}
              accessories={[{ text: `PID ${a.pid}` }]}
              actions={<RefreshAction revalidate={revalidate} />}
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

function RefreshAction({ revalidate }: { revalidate: () => void }) {
  return (
    <ActionPanel>
      <RefreshOnly revalidate={revalidate} />
    </ActionPanel>
  );
}

function RefreshOnly({ revalidate }: { revalidate: () => void }) {
  return (
    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
  );
}
