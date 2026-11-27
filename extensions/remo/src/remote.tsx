import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { device, power, press } from "./roku";

type Key = {
  key: string;
  title: string;
  icon: Icon;
  shortcut?: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };
};

// Shortcuts mirror the Remo app (and Roam).
const keys: Key[] = [
  { key: "Select", title: "OK", icon: Icon.CircleFilled },
  {
    key: "Up",
    title: "Up",
    icon: Icon.ArrowUp,
    shortcut: { modifiers: ["opt"], key: "arrowUp" },
  },
  {
    key: "Down",
    title: "Down",
    icon: Icon.ArrowDown,
    shortcut: { modifiers: ["opt"], key: "arrowDown" },
  },
  {
    key: "Left",
    title: "Left",
    icon: Icon.ArrowLeft,
    shortcut: { modifiers: ["opt"], key: "arrowLeft" },
  },
  {
    key: "Right",
    title: "Right",
    icon: Icon.ArrowRight,
    shortcut: { modifiers: ["opt"], key: "arrowRight" },
  },
  {
    key: "Back",
    title: "Back",
    icon: Icon.ArrowCounterClockwise,
    shortcut: { modifiers: ["cmd"], key: "arrowLeft" },
  },
  {
    key: "Home",
    title: "Home",
    icon: Icon.House,
    shortcut: { modifiers: ["cmd", "shift"], key: "h" },
  },
  {
    key: "Play",
    title: "Play/Pause",
    icon: Icon.Play,
    shortcut: { modifiers: ["cmd"], key: "p" },
  },
  {
    key: "Rev",
    title: "Rewind",
    icon: Icon.Rewind,
    shortcut: { modifiers: ["cmd", "opt"], key: "arrowLeft" },
  },
  {
    key: "Fwd",
    title: "Fast Forward",
    icon: Icon.Forward,
    shortcut: { modifiers: ["cmd", "opt"], key: "arrowRight" },
  },
  {
    key: "InstantReplay",
    title: "Instant Replay",
    icon: Icon.Repeat,
    shortcut: { modifiers: ["cmd"], key: "r" },
  },
  {
    key: "Info",
    title: "Options",
    icon: Icon.Ellipsis,
    shortcut: { modifiers: ["cmd"], key: "i" },
  },
  {
    key: "VolumeUp",
    title: "Volume Up",
    icon: Icon.SpeakerUp,
    shortcut: { modifiers: ["cmd"], key: "arrowUp" },
  },
  {
    key: "VolumeDown",
    title: "Volume Down",
    icon: Icon.SpeakerDown,
    shortcut: { modifiers: ["cmd"], key: "arrowDown" },
  },
  {
    key: "VolumeMute",
    title: "Mute",
    icon: Icon.SpeakerOff,
    shortcut: { modifiers: ["cmd"], key: "m" },
  },
];

export default function Command() {
  const { data: tv, isLoading } = usePromise(device);

  async function send(k: Key) {
    try {
      await press(k.key);
    } catch (e) {
      await showFailureToast(e, { title: "Couldn’t reach the TV" });
    }
  }

  async function togglePower() {
    try {
      await power();
    } catch (e) {
      await showFailureToast(e, { title: "Couldn’t reach the TV" });
    }
  }

  const all = (
    <ActionPanel.Section title="Remote">
      {keys.map((k) => (
        <Action
          key={k.key}
          title={k.title}
          icon={k.icon}
          shortcut={k.shortcut}
          onAction={() => send(k)}
        />
      ))}
      <Action
        title="Power"
        icon={Icon.Power}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={togglePower}
      />
    </ActionPanel.Section>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter buttons">
      <List.Section title={tv?.name ?? "Remote"}>
        {keys.map((k) => (
          <List.Item
            key={k.key}
            title={k.title}
            icon={k.icon}
            accessories={
              k.shortcut
                ? [
                    {
                      tag:
                        k.shortcut.modifiers
                          .join("+")
                          .replace("cmd", "⌘")
                          .replace("opt", "⌥")
                          .replace("shift", "⇧") +
                        " " +
                        k.shortcut.key.replace("arrow", ""),
                    },
                  ]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Press ${k.title}`}
                  icon={k.icon}
                  onAction={() => send(k)}
                />
                {all}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
