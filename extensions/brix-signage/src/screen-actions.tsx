import { Action, ActionPanel, Alert, Color, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { sendJson } from "./api";
import { Screen } from "./types";

interface Command {
  kind: string;
  title: string;
  icon: Icon;
  done: string;
  confirm?: string;
  shortcut?: Keyboard.Shortcut;
}

/** Only the commands that need no settings. The others are better made in the console. */
const COMMANDS: Command[] = [
  {
    kind: "refresh",
    title: "Reload Content",
    icon: Icon.ArrowClockwise,
    done: "The screen reloads its content",
    shortcut: { macOS: { modifiers: ["cmd", "shift"], key: "l" }, Windows: { modifiers: ["ctrl", "shift"], key: "l" } },
  },
  {
    kind: "restart-app",
    title: "Restart Player",
    icon: Icon.RotateClockwise,
    done: "The player restarts",
    confirm: "The screen is black for a few seconds while the player restarts.",
  },
  {
    kind: "reboot",
    title: "Restart Screen",
    icon: Icon.Power,
    done: "The screen restarts",
    confirm: "The screen restarts. The screen can be black for up to two minutes.",
  },
  {
    kind: "clear-cache",
    title: "Clear Cache",
    icon: Icon.Trash,
    done: "The screen clears its cache",
    confirm: "The screen downloads all of its content again.",
  },
  { kind: "screenshot", title: "Take Screenshot", icon: Icon.Camera, done: "The screen takes a screenshot" },
  { kind: "cec-on", title: "Turn Screen On", icon: Icon.Sun, done: "The screen turns on" },
  {
    kind: "cec-off",
    title: "Turn Screen Off",
    icon: Icon.Moon,
    done: "The screen goes to standby",
    confirm:
      "The screen goes to standby until a person or a command turns the screen on again. This works only on screens that accept HDMI-CEC.",
  },
];

async function run(screen: Screen, command: Command, onDone?: () => void) {
  if (command.confirm) {
    const ok = await confirmAlert({
      title: `${command.title} on "${screen.name}"?`,
      message: command.confirm,
      primaryAction: { title: command.title, style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `${command.title}…` });
  try {
    await sendJson("POST", `/v1/screens/${encodeURIComponent(screen.id)}/commands`, { kind: command.kind });
    toast.style = Toast.Style.Success;
    toast.title = command.done;
    toast.message =
      screen.status === "online" ? "In a few seconds." : "The screen is offline. It runs the command when it connects.";
    onDone?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${command.title} failed`;
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

async function endCast(screen: Screen, onDone?: () => void) {
  if (!screen.activeCastId) return;
  const ok = await confirmAlert({
    title: "End the message?",
    message: `The message on "${screen.name}" ends on every screen that shows it, not only on this screen. You cannot undo this.`,
    primaryAction: { title: "End Message", style: Alert.ActionStyle.Destructive },
  });
  if (!ok) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: "Ending message…" });
  try {
    await sendJson("POST", `/v1/casts/${encodeURIComponent(screen.activeCastId)}/clear`, {});
    toast.style = Toast.Style.Success;
    toast.title = "Message ended";
    toast.message = "The screens go back to their usual content.";
    onDone?.();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not end the message";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

export function ScreenCommandActions({ screen, onDone }: { screen: Screen; onDone?: () => void }) {
  return (
    <>
      <ActionPanel.Section title="Commands">
        {COMMANDS.map((command) => (
          <Action
            key={command.kind}
            title={command.title}
            icon={command.icon}
            shortcut={command.shortcut}
            style={command.confirm ? Action.Style.Destructive : Action.Style.Regular}
            onAction={() => run(screen, command, onDone)}
          />
        ))}
      </ActionPanel.Section>
      {screen.activeCastId ? (
        <ActionPanel.Section>
          <Action
            title="End Message"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            style={Action.Style.Destructive}
            onAction={() => endCast(screen, onDone)}
          />
        </ActionPanel.Section>
      ) : null}
    </>
  );
}
