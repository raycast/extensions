import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BREW_INSTALL,
  CliMissingError,
  DAEMON_INSTALL,
  DaemonInfo,
  Fan,
  fanControl,
  read,
  Reading,
  Sensor,
  setFans,
} from "./ougi";

const REFRESH_MS = 2000;
const PERCENTS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const SETUP_URL = "https://github.com/arturious/ougi#setup";
const TERMINAL = "/System/Applications/Utilities/Terminal.app";

function tempColor(t: number): Color {
  if (t >= 90) return Color.Red;
  if (t >= 80) return Color.Orange;
  if (t >= 60) return Color.Yellow;
  return Color.Green;
}

const deg = (t: number) => `${t.toFixed(0)}°`;
const rpm = (v: number) => `${Math.round(v)} rpm`;
const percentOf = (fan: Fan) =>
  fan.max > fan.min ? Math.round(((fan.actual - fan.min) / (fan.max - fan.min)) * 100) : 0;

function useReading() {
  const [reading, setReading] = useState<Reading>();
  const [error, setError] = useState<Error>();
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setReading(await read());
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { reading, error, refresh };
}

function SetupActions({ command }: { command: string }) {
  return (
    <>
      <Action.CopyToClipboard title="Copy Command" content={command} />
      <Action.Open title="Open Terminal" target={TERMINAL} icon={Icon.Terminal} />
      <Action.OpenInBrowser title="Open Setup Guide" url={SETUP_URL} />
    </>
  );
}

export default function Command() {
  const { reading, error, refresh } = useReading();

  // Fan controls always apply to every fan, whichever one is selected.
  async function apply(value: string, label: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Fans: ${label}`,
      message: "Taking over from the system can take a few seconds",
    });
    try {
      await setFans(value);
      toast.style = Toast.Style.Success;
      toast.message = undefined;
      await refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not change fan speed";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  const refreshAction = (
    <ActionPanel.Section>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </ActionPanel.Section>
  );

  if (error instanceof CliMissingError) {
    return (
      <List>
        <List.EmptyView
          icon="icon.png"
          title="Install the ougi Command-Line Tool"
          description={`Ougi reads sensors and controls fans through a small open-source tool. Install it with Homebrew:\n\n${BREW_INSTALL}`}
          actions={
            <ActionPanel>
              <SetupActions command={BREW_INSTALL} />
              {refreshAction}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (error && !reading) {
    return (
      <List>
        <List.EmptyView icon={Icon.Warning} title="Cannot Read Sensors" description={error.message} />
      </List>
    );
  }

  const fans = reading?.fans ?? [];
  const control = reading ? fanControl(reading) : "ready";
  const byGroup = new Map<string, Sensor[]>();
  for (const s of reading?.sensors ?? []) byGroup.set(s.group, [...(byGroup.get(s.group) ?? []), s]);

  const fanActions =
    control === "ready" ? (
      <ActionPanel>
        <ActionPanel.Section title="All Fans">
          <Action title="Auto" icon={Icon.Wand} onAction={() => apply("auto", "Auto")} />
          <Action
            title="Max"
            icon={Icon.Wind}
            shortcut={{ modifiers: ["cmd"], key: "m" }}
            onAction={() => apply("max", "Max")}
          />
          <ActionPanel.Submenu title="Set Speed" icon={Icon.Gauge} shortcut={Keyboard.Shortcut.Common.Duplicate}>
            {PERCENTS.map((p) => (
              <Action key={p} title={`${p}%`} onAction={() => apply(`${p}%`, `${p}%`)} />
            ))}
          </ActionPanel.Submenu>
          <Action.Push
            title="Set Custom RPM…"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RpmForm fans={fans} onSubmit={(value) => apply(value, `${value} rpm`)} />}
          />
        </ActionPanel.Section>
        {refreshAction}
      </ActionPanel>
    ) : (
      <ActionPanel>
        <ActionPanel.Section title={control === "missing" ? "Enable Fan Control" : "Update Fan Control"}>
          <SetupActions command={DAEMON_INSTALL} />
        </ActionPanel.Section>
        {refreshAction}
      </ActionPanel>
    );

  const controlNote =
    control === "missing" ? "fan control not set up" : control === "outdated" ? "fan control needs update" : undefined;

  return (
    <List isLoading={!reading} isShowingDetail searchBarPlaceholder="Filter sensors…">
      {error && (
        // Readings below are from the last successful refresh; say so instead of passing them off as current.
        <List.Item
          title="Readings Are Out of Date"
          subtitle={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          detail={
            <List.Item.Detail
              markdown={`### Readings are out of date\n\nThe last refresh failed:\n\n\`${error.message}\``}
            />
          }
          actions={<ActionPanel>{refreshAction}</ActionPanel>}
        />
      )}
      {fans.length > 0 && (
        <List.Section title="Fans" subtitle={controlNote}>
          {fans.map((fan) => (
            <List.Item
              key={fan.id}
              title={`Fan ${fan.id + 1}`}
              icon={{ source: Icon.Wind, tintColor: fan.actual > 0 ? Color.Blue : Color.SecondaryText }}
              accessories={[{ text: fan.actual > 0 ? rpm(fan.actual) : "off" }, modeTag(fan)]}
              detail={<FanDetail fan={fan} daemon={reading?.daemon} control={control} />}
              actions={fanActions}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Temperatures">
        {(reading?.groups ?? []).map((group) => {
          const sensors = byGroup.get(group);
          if (!sensors) return null;
          const values = sensors.map((s) => s.value);
          const max = Math.max(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          return (
            <List.Item
              key={group}
              title={group}
              icon={{ source: Icon.Temperature, tintColor: tempColor(max) }}
              keywords={sensors.flatMap((s) => [s.key, s.name])}
              accessories={[{ text: `avg ${deg(avg)}` }, { tag: { value: deg(max), color: tempColor(max) } }]}
              detail={<GroupDetail group={group} sensors={sensors} />}
              actions={<ActionPanel>{refreshAction}</ActionPanel>}
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function modeTag(fan: Fan): List.Item.Accessory {
  return fan.manual
    ? { tag: { value: "Manual", color: Color.Orange }, tooltip: `Target ${rpm(fan.target)}` }
    : { tag: { value: "Auto", color: Color.Green } };
}

function FanDetail({ fan, daemon, control }: { fan: Fan; daemon?: DaemonInfo; control: string }) {
  const M = List.Item.Detail.Metadata;
  const trip = daemon?.guard.lastTrip;
  return (
    <List.Item.Detail
      metadata={
        <M>
          <M.Label title={`Fan ${fan.id + 1}`} text={fan.actual > 0 ? rpm(fan.actual) : "Stopped"} />
          {fan.actual > 0 && <M.Label title="Level" text={`${percentOf(fan)}%`} />}
          <M.TagList title="Mode">
            <M.TagList.Item text={fan.manual ? "Manual" : "Auto"} color={fan.manual ? Color.Orange : Color.Green} />
          </M.TagList>
          {fan.manual && <M.Label title="Target" text={rpm(fan.target)} />}
          <M.Label title="Range" text={`${rpm(fan.min)} – ${rpm(fan.max)}`} />
          <M.Separator />
          {control === "ready" && daemon ? (
            <>
              <M.Label
                title="Overheat Protection"
                text={`Auto at ${deg(daemon.guard.threshold)}C`}
                icon={{ source: Icon.Shield, tintColor: Color.Green }}
              />
              {trip && (
                <M.Label
                  title="Last Triggered"
                  text={`${new Date(trip.time).toLocaleString()} · ${deg(trip.temperature)}C`}
                />
              )}
            </>
          ) : (
            <>
              <M.Label
                title="Fan Control"
                text={control === "missing" ? "Not set up" : "Needs update"}
                icon={{ source: Icon.Warning, tintColor: Color.Orange }}
              />
              <M.Label title="Run in Terminal" text={DAEMON_INSTALL} />
            </>
          )}
        </M>
      }
    />
  );
}

function GroupDetail({ group, sensors }: { group: string; sensors: Sensor[] }) {
  const rows = [...sensors]
    .sort((a, b) => b.value - a.value)
    .map((s) => `| ${s.name === s.key ? `\`${s.key}\`` : `${s.name} \`${s.key}\``} | ${s.value.toFixed(1)}° |`);
  const markdown = [`### ${group}`, "", "| Sensor | °C |", "|:--|--:|", ...rows].join("\n");
  return <List.Item.Detail markdown={markdown} />;
}

function RpmForm({ fans, onSubmit }: { fans: Fan[]; onSubmit: (value: string) => void }) {
  const { pop } = useNavigation();
  const min = Math.max(...fans.map((f) => f.min));
  const max = Math.min(...fans.map((f) => f.max));
  const [error, setError] = useState<string>();

  function validate(value?: string) {
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n < min || n > max) return `Enter ${Math.round(min)}–${Math.round(max)}`;
  }

  return (
    <Form
      navigationTitle="All Fans"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Speed"
            onSubmit={({ rpm }: { rpm: string }) => {
              const problem = validate(rpm);
              if (problem) return setError(problem);
              onSubmit(String(Math.round(Number(rpm))));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="rpm"
        title="RPM"
        placeholder={`${Math.round(min)}–${Math.round(max)}`}
        error={error}
        onChange={() => setError(undefined)}
        onBlur={(e) => setError(validate(e.target.value))}
      />
    </Form>
  );
}
