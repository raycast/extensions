import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { toggleActivity } from "../activities/api";
import { confirmAndDeleteActivity } from "../activities/confirmAndDelete";
import { Activity } from "../activities/types";
import { EditCurrentTimer } from "./EditCurrentTimer";
import { finishMenuBarForm } from "../../utils/refresh";

// Actions for an activity, opened by a right-click on a row of the "Today" submenu.
export const ActivityActions = ({ activity }: { activity: Activity }) => {
  const isRunning = activity.timer_started_at !== null;

  const toggle = async () => {
    if ((await toggleActivity(activity.id, !isRunning)) === true) {
      await finishMenuBarForm();
    }
  };

  const remove = async () => {
    if (await confirmAndDeleteActivity(activity)) {
      await finishMenuBarForm();
    }
  };

  return (
    <List navigationTitle={`${activity.project.name} / ${activity.task.name}`} searchBarPlaceholder="Filter actions...">
      <List.Item
        icon={Icon.Pencil}
        title="Edit…"
        subtitle="Description and time"
        actions={
          <ActionPanel>
            <Action.Push title="Edit…" icon={Icon.Pencil} target={<EditCurrentTimer activity={activity} />} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={isRunning ? Icon.Stop : Icon.Play}
        title={isRunning ? "Stop Timer" : "Continue Timer"}
        actions={
          <ActionPanel>
            <Action
              title={isRunning ? "Stop Timer" : "Continue Timer"}
              icon={isRunning ? Icon.Stop : Icon.Play}
              onAction={toggle}
            />
          </ActionPanel>
        }
      />
      {/* Like the activity list: no delete while the timer runs. */}
      {!isRunning ? (
        <List.Item
          icon={{ source: Icon.Trash, tintColor: Color.Red }}
          title="Delete Activity"
          actions={
            <ActionPanel>
              <Action
                title="Delete Activity"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={remove}
              />
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
};
