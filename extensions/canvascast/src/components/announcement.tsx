import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { announcement, Preferences } from "../utils/types";
import { Icons } from "../utils/utils";

export const Announcement = (props: announcement) => {
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      title={props.title}
      subtitle={props.course}
      icon={{ source: Icons["Announcement"], tintColor: props.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Announcement"
            icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={props.markdown}
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
