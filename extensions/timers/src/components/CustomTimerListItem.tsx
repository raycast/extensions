import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { CommandLinkParams, CustomTimer } from "../backend/types";
import { formatTime } from "../backend/formatUtils";
import useTimers from "../hooks/useTimers";
import EditPresetView from "./EditPresetView";

const createPresetLink = (ctID: string): string => {
  const payload: CommandLinkParams = { timerID: ctID };
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/ThatNerd/timers/manageTimers?context=${encodedPayload}`;
};

export default function CustomTimerListItem(props: { customTimer: CustomTimer; id: string }) {
  const { handleStartCT, handleDeleteCT } = useTimers();
  return (
    <List.Item
      icon={Icon.Clock}
      title={props.customTimer.name}
      subtitle={formatTime(props.customTimer.timeInSeconds)}
      actions={
        <ActionPanel>
          <Action
            title="Start Timer"
            icon={Icon.Hourglass}
            onAction={() => handleStartCT({ customTimer: props.customTimer })}
          />
          <Action.Push
            title="Edit Preset"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditPresetView id={props.id} preset={props.customTimer} />}
          />
          <Action
            title="Delete Custom Timer"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleDeleteCT(props.id)}
          />
          <Action.CreateQuicklink
            quicklink={{
              name: props.customTimer.name,
              link: createPresetLink(props.id),
            }}
            title="Add Preset to Root Search"
          />
        </ActionPanel>
      }
    />
  );
}
