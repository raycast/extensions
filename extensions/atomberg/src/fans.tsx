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
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  AtombergError,
  accountFingerprint,
  Command,
  Fan,
  SPEEDS,
  TIMERS,
  clearStoredData,
  forgetDevices,
  hasLight,
  loadFans,
  sendCommand,
  timerForHours,
} from "./atomberg";

/** "Off" in the speed dropdown, alongside the real speeds 1-6. */
const OFF = "0";

function describe(error: unknown): string {
  if (error instanceof AtombergError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

function clampSpeed(speed: number): number {
  return Math.min(Math.max(Math.round(speed) || 1, 1), SPEEDS.length);
}

/** What the dropdown should read for a fan: its speed, or "Off" when stopped. */
function dropdownValue(fan: Fan | undefined): string {
  if (!fan) return OFF;
  return fan.power ? String(clampSpeed(fan.last_recorded_speed)) : OFF;
}

/** The API reports these lowercase ("studio+"), which reads as a typo in the pane. */
function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

interface MetadataProps {
  fan: Fan;
  onPower: () => void;
  onSpeed: (speed: number) => void;
}

function Metadata({ fan, onPower, onSpeed }: MetadataProps) {
  const timer = TIMERS.find((entry) => entry.value === timerForHours(fan.timer_hours));
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Power">
        <List.Item.Detail.Metadata.TagList.Item
          text={fan.power ? "On" : "Off"}
          color={fan.power ? Color.Green : Color.SecondaryText}
          onAction={onPower}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.TagList title="Speed">
        {SPEEDS.map((speed) => (
          <List.Item.Detail.Metadata.TagList.Item
            key={speed}
            text={String(speed)}
            color={fan.power && speed <= clampSpeed(fan.last_recorded_speed) ? Color.Green : Color.SecondaryText}
            onAction={() => onSpeed(speed)}
          />
        ))}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Sleep Mode"
        icon={fan.sleep_mode ? Icon.Moon : undefined}
        text={fan.sleep_mode ? "On" : "Off"}
      />
      {hasLight(fan) && (
        <List.Item.Detail.Metadata.Label
          title="Light"
          icon={fan.led ? Icon.LightBulb : undefined}
          text={fan.led ? "On" : "Off"}
        />
      )}
      <List.Item.Detail.Metadata.Label
        title="Timer"
        icon={timer && timer.value !== 0 ? Icon.Clock : undefined}
        text={timer?.label ?? "Off"}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label title="Model" text={titleCase(fan.model)} />
      <List.Item.Detail.Metadata.Label title="Series" text={fan.series.toUpperCase()} />
    </List.Item.Detail.Metadata>
  );
}

export default function Fans() {
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    // The fingerprint sits in the argument list so the cached fan list is keyed
    // per account: changing credentials can no longer flash up the previous
    // account's fans before the reload lands.
    (forceRefresh: boolean, account: string) => loadFans(forceRefresh, account),
    [false, accountFingerprint()],
    {
      initialData: [] as Fan[],
      failureToastOptions: { title: "Couldn't load your fans" },
    },
  );

  // A failed load must not leave fans on screen. The cached list outlives both
  // a logout and a credential change, so showing it after an error would claim
  // an account is signed in when it isn't.
  const fans = error ? [] : (data ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = fans.find((fan) => fan.device_id === selectedId) ?? fans[0];

  /**
   * Apply a command, updating the list immediately and rolling back if the
   * cloud rejects it. Nothing is re-fetched afterwards — the API budget is
   * about 100 calls a day, and we already know the resulting state.
   */
  async function apply(fan: Fan, command: Command, changes: Partial<Fan>, title: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title });
    try {
      await mutate(sendCommand(fan.device_id, command), {
        optimisticUpdate: (current) =>
          (current ?? []).map((item) => (item.device_id === fan.device_id ? { ...item, ...changes } : item)),
        rollbackOnError: true,
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Command failed";
      toast.message = describe(error);
    }
  }

  function setSpeed(fan: Fan, speed: number) {
    // Setting a speed on a stopped fan starts it, so reflect that locally too.
    return apply(fan, { speed }, { last_recorded_speed: speed, power: true }, `Speed ${speed} · ${fan.name}`);
  }

  /**
   * The dropdown also fires on mount and whenever a different fan is selected.
   * Comparing against the fan's own state makes those a no-op, so only a real
   * choice sends a command.
   */
  function chooseSpeed(value: string) {
    if (!selected || value === dropdownValue(selected)) return;
    if (value === OFF) {
      return apply(selected, { power: false }, { power: false }, `Turning off ${selected.name}`);
    }
    return setSpeed(selected, Number(value));
  }

  function nudge(fan: Fan, delta: number) {
    const next = clampSpeed(clampSpeed(fan.last_recorded_speed) + delta);
    if (next === clampSpeed(fan.last_recorded_speed) && fan.power) {
      return showToast({
        style: Toast.Style.Failure,
        title: delta > 0 ? "Already at top speed" : "Already at lowest speed",
      });
    }
    return setSpeed(fan, next);
  }

  /**
   * Re-read the device list.
   *
   * Dropping the cache and revalidating costs one load; mutating through a
   * fresh `loadFans` would make the hook revalidate afterwards and pay twice.
   */
  function resync() {
    forgetDevices();
    revalidate();
  }

  /**
   * Clear what the extension stored, then hand the user to preferences — a
   * Raycast extension can read its preferences but not write them, so the API
   * key and refresh token have to be deleted there.
   */
  async function logOut() {
    const confirmed = await confirmAlert({
      title: "Log Out of Atomberg?",
      message:
        "Clears the cached access token and device list, then opens preferences. You are not logged out until you delete the API key and refresh token there — otherwise opening a command signs straight back in.",
      icon: Icon.Logout,
      primaryAction: { title: "Log Out", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    await mutate(clearStoredData(), { optimisticUpdate: () => [], shouldRevalidateAfter: false });
    await showToast({
      style: Toast.Style.Success,
      title: "Cached Data Cleared",
      message: "Delete the API key and refresh token in preferences to finish logging out.",
    });
    await openExtensionPreferences();
  }

  const accountActions = (
    <ActionPanel.Section title="Account">
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action
        title="Log out"
        icon={Icon.Logout}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
        onAction={logOut}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={fans.length > 0}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Search your fans…"
      searchBarAccessory={
        fans.length > 0 ? (
          <List.Dropdown tooltip="Fan Speed" value={dropdownValue(selected)} onChange={chooseSpeed}>
            <List.Dropdown.Item title="Off" value={OFF} icon={Icon.Power} />
            <List.Dropdown.Section title="Speed">
              {SPEEDS.map((speed) => (
                <List.Dropdown.Item key={speed} title={`Speed ${speed}`} value={String(speed)} icon={Icon.Wind} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.Wind}
        title={isLoading ? "Loading your fans…" : error ? "Couldn't load your fans" : "No fans found"}
        description={
          isLoading
            ? undefined
            : error
              ? describe(error)
              : "This Atomberg account has no smart fans paired, or Developer Mode is off in the app."
        }
        actions={
          <ActionPanel>
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={resync} />
            {accountActions}
          </ActionPanel>
        }
      />
      {fans.map((fan) => (
        <List.Item
          key={fan.device_id}
          id={fan.device_id}
          icon={{ source: Icon.Wind, tintColor: fan.power ? Color.Green : Color.SecondaryText }}
          title={fan.name}
          detail={
            <List.Item.Detail
              metadata={
                <Metadata
                  fan={fan}
                  onPower={() =>
                    apply(
                      fan,
                      { power: !fan.power },
                      { power: !fan.power },
                      `${fan.power ? "Turning off" : "Turning on"} ${fan.name}`,
                    )
                  }
                  onSpeed={(speed) => setSpeed(fan, speed)}
                />
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title={fan.power ? "Turn off" : "Turn on"}
                  icon={fan.power ? Icon.Plug : Icon.Power}
                  onAction={() =>
                    apply(
                      fan,
                      { power: !fan.power },
                      { power: !fan.power },
                      `${fan.power ? "Turning off" : "Turning on"} ${fan.name}`,
                    )
                  }
                />
                <Action
                  title="Faster"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                  onAction={() => nudge(fan, 1)}
                />
                <Action
                  title="Slower"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                  onAction={() => nudge(fan, -1)}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Speed">
                {SPEEDS.map((speed) => (
                  <Action
                    key={speed}
                    title={`Speed ${speed}`}
                    icon={speed === clampSpeed(fan.last_recorded_speed) && fan.power ? Icon.CircleFilled : Icon.Circle}
                    shortcut={{ modifiers: ["cmd"], key: String(speed) as Keyboard.KeyEquivalent }}
                    onAction={() => setSpeed(fan, speed)}
                  />
                ))}
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title={fan.sleep_mode ? "Turn off Sleep Mode" : "Turn on Sleep Mode"}
                  icon={Icon.Moon}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  onAction={() =>
                    apply(
                      fan,
                      { sleep: !fan.sleep_mode },
                      { sleep_mode: !fan.sleep_mode },
                      `${fan.sleep_mode ? "Disabling" : "Enabling"} sleep mode`,
                    )
                  }
                />
                {hasLight(fan) && (
                  <Action
                    title={fan.led ? "Turn off Light" : "Turn on Light"}
                    icon={Icon.LightBulb}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={() =>
                      apply(fan, { led: !fan.led }, { led: !fan.led }, fan.led ? "Light off" : "Light on")
                    }
                  />
                )}
                <ActionPanel.Submenu title="Set Timer" icon={Icon.Clock} shortcut={{ modifiers: ["cmd"], key: "t" }}>
                  {TIMERS.map((timer) => (
                    <Action
                      key={timer.value}
                      title={timer.label}
                      icon={Icon.Clock}
                      onAction={() =>
                        apply(fan, { timer: timer.value }, { timer_hours: timer.hours }, `Timer: ${timer.label}`)
                      }
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidate()}
                />
                <Action
                  title="Resync Device List"
                  icon={Icon.Repeat}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={resync}
                />
              </ActionPanel.Section>

              {accountActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
