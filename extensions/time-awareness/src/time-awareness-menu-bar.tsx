import { Icon, MenuBarExtra } from "@raycast/api";
import { ICONS } from "./constants";
import { useActiveSession } from "./hooks/useActiveSession";
import { useConfettiSetting } from "./hooks/useConfettiSetting";
import { formatTime } from "./utils/time";

export default function Command() {
  const session = useActiveSession();
  const { confettiEnabled, toggleConfetti } = useConfettiSetting();

  const menuBarTitle = session.showAchievement
    ? ICONS.ACHIEVEMENT
    : session.isIdle
      ? ICONS.IDLE_HEART
      : formatTime(session.activeSeconds, false);

  return (
    <MenuBarExtra title={menuBarTitle} isLoading={session.isLoading}>
      <MenuBarExtra.Section title="Current Session">
        <MenuBarExtra.Item title={`Active Time: ${formatTime(session.activeSeconds)}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Stats">
        <MenuBarExtra.Item title={`Intervals Completed: ${session.sessionCount}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Settings">
        <MenuBarExtra.Item
          icon={confettiEnabled ? Icon.Checkmark : Icon.XMarkCircle}
          title={`Toggle Confetti (${confettiEnabled ? "On" : "Off"})`}
          shortcut={{ modifiers: ["cmd"], key: "t" }}
          onAction={toggleConfetti}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={session.actions.refresh}
        />
        <MenuBarExtra.Item
          icon={Icon.Clock}
          title="Reset Session Time"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          onAction={session.actions.resetSessionTime}
        />
        <MenuBarExtra.Item
          icon={Icon.Hashtag}
          title="Reset Stats"
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          onAction={session.actions.resetStats}
        />
        <MenuBarExtra.Item
          icon={Icon.Trash}
          title="Reset All"
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          onAction={session.actions.resetAll}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
