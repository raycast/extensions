import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { assignment, Preferences } from "../utils/types";
import { Icons } from "../utils/utils";

export const Assignment = (props: assignment) => {
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      title={props.name}
      subtitle={props.course}
      icon={{ source: Icons["Assignment"], tintColor: props.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Description"
            icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={props.description}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
                    />
                  </ActionPanel>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
          />
        </ActionPanel>
      }
      accessories={[{ text: props.date, icon: Icon.Calendar }]}
    />
  );
};
