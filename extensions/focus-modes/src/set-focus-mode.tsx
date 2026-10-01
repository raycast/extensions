import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType, List } from "@raycast/api";
import { createDeeplink, showFailureToast, usePromise } from "@raycast/utils";
import { focusColor, focusIcon } from "./appearance";
import { FOCUS_SETTINGS, FULL_DISK_ACCESS_SETTINGS, FocusMode, FullDiskAccessError, getFocusState } from "./focus";

// Switching is done by the no-view commands: they keep running while the first-time setup
// waits in Shortcuts, which a list that has been closed can't rely on.
async function launch(name: string, args?: Record<string, string>) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated, arguments: args });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn’t change Focus" });
  }
}

const turnOn = (mode: FocusMode) => launch("turn-on-focus", { focus: mode.id });
const turnOff = () => launch("turn-off-focus");

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(getFocusState, [], {
    onError: (error) => {
      if (!(error instanceof FullDiskAccessError)) showFailureToast(error, { title: "Couldn’t read Focus modes" });
    },
  });

  if (error instanceof FullDiskAccessError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Full Disk Access Required"
          description="macOS only lets apps with Full Disk Access read your Focus modes. Turn it on for Raycast in System Settings, then open this command again."
          actions={
            <ActionPanel>
              <Action.Open title="Open Privacy Settings" icon={Icon.Gear} target={FULL_DISK_ACCESS_SETTINGS} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const modes = data?.modes ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Focus modes">
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Moon}
          title="No Focus Modes"
          description="Add a Focus in System Settings to see it here."
        />
      )}
      {modes.map((mode) => {
        const isOn = mode.id === data?.activeId;
        return (
          <List.Item
            key={mode.id}
            icon={focusIcon(mode)}
            title={mode.name}
            accessories={isOn ? [{ tag: { value: "On", color: focusColor(mode) } }] : []}
            actions={
              <ActionPanel>
                {isOn ? (
                  <Action title="Turn off" icon={Icon.XMarkCircle} onAction={turnOff} />
                ) : (
                  <Action title="Turn on" icon={Icon.Power} onAction={() => turnOn(mode)} />
                )}
                {!isOn && data?.activeId && (
                  <Action
                    title="Turn off Focus"
                    icon={Icon.XMarkCircle}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    onAction={turnOff}
                  />
                )}
                <Action.CreateQuicklink
                  title="Create Quicklink"
                  quicklink={{
                    name: `Turn on ${mode.name}`,
                    link: createDeeplink({
                      command: "turn-on-focus",
                      launchType: LaunchType.Background,
                      arguments: { focus: mode.id },
                    }),
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action.Open title="Open Focus Settings" icon={Icon.Gear} target={FOCUS_SETTINGS} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
