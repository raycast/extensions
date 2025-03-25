import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CommandLinkParams, CustomTimer } from "../backend/types";
import { formatTime } from "../backend/formatUtils";
import useTimers from "../hooks/useTimers";
import RenameAction from "./RenameAction";

const createPresetLink = (ctID: string): string => {
  const payload: CommandLinkParams = { timerID: ctID };
  const encodedPayload = encodeURIComponent(JSON.stringify(payload));
  return `raycast://extensions/ThatNerd/timers/manageTimers?context=${encodedPayload}`;
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
          <RenameAction
            renameLabel="Timer"
            currentName={props.customTimer.name}
            originalFile={"customTimer"}
            ctID={props.id}
          />
          <Action
            title="Delete Custom Timer"
            icon={Icon.Trash}
            shortcut={{
              modifiers: ["ctrl"],
              key: "x",
            }}
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
