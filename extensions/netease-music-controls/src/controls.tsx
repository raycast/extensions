import { Action, ActionPanel, List } from "@raycast/api";
import { ACTIONS, ActionId, runAction } from "./actions";

const playbackActions: ActionId[] = ["play", "stop", "toggle-play", "next-track", "previous-track"];
const volumeActions: ActionId[] = ["turn-up-volume", "turn-down-volume"];
const favoriteActions: ActionId[] = ["like", "dislike"];
const otherActions: ActionId[] = ["toggle-lyrics", "customize-touch-bar"];

export default function Command() {
  return (
    <List searchBarPlaceholder="Search NetEase Music controls...">
      <List.Section title="Playback">
        {playbackActions.map((id) => (
          <ControlItem key={id} id={id} />
        ))}
      </List.Section>

      <List.Section title="Volume">
        {volumeActions.map((id) => (
          <ControlItem key={id} id={id} />
        ))}
      </List.Section>

      <List.Section title="Favorites">
        {favoriteActions.map((id) => (
          <ControlItem key={id} id={id} />
        ))}
      </List.Section>

      <List.Section title="Playback Mode">
        <List.Item
          title="Repeat"
          subtitle="Choose Off, One, or All"
          keywords={["repeat", "off", "one", "all", "loop"]}
          actions={
            <ActionPanel>
              <ActionPanel.Submenu title="Set Repeat…">
                <RunAction id="repeat-off" />
                <RunAction id="repeat-one" />
                <RunAction id="repeat-all" />
              </ActionPanel.Submenu>
              <RunAction id="repeat-off" />
              <RunAction id="repeat-one" />
              <RunAction id="repeat-all" />
            </ActionPanel>
          }
        />
        <ControlItem id="toggle-shuffle" />
      </List.Section>

      <List.Section title="Other">
        {otherActions.map((id) => (
          <ControlItem key={id} id={id} />
        ))}
      </List.Section>
    </List>
  );
}

interface ControlItemProps {
  id: ActionId;
}

function ControlItem({ id }: ControlItemProps) {
  const action = ACTIONS[id];

  return (
    <List.Item
      title={action.title}
      subtitle={action.subtitle}
      keywords={[action.title, action.subtitle]}
      actions={
        <ActionPanel>
          <RunAction id={id} />
        </ActionPanel>
      }
    />
  );
}

interface RunActionProps {
  id: ActionId;
}

function RunAction({ id }: RunActionProps) {
  const action = ACTIONS[id];

  return (
    <Action
      title={action.title}
      onAction={async () => {
        await runAction(id);
      }}
    />
  );
}
