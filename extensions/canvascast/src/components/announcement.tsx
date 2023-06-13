import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { announcement, Preferences } from "../utils/types";
import { Icons, convertHTMLToMD, getFormattedTime } from "../utils/utils";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

export const Announcement = (props: announcement) => {
  const preferences: Preferences = getPreferenceValues();

  const [apiAnnouncement, setApiAnnouncement] = useState<any>({});
  useEffect(() => {
    async function load() {
      const apiAnnouncement = await api.courses[props.course_id].discussion_topics[props.id].get();
      setApiAnnouncement(apiAnnouncement);
    }
    load();
  }, []);

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
                markdown={
                  apiAnnouncement.message && apiAnnouncement.title
                    ? `# ${apiAnnouncement.title}\n\n${convertHTMLToMD(apiAnnouncement.message)}`
                    : ""
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Posted"
                      text={new Date(props.date).toDateString() + " at " + getFormattedTime(props.date)}
                    />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.TagList title="Course">
                      <Detail.Metadata.TagList.Item
                        text={props.course}
                        color={props.course_color ?? Color.PrimaryText}
                      />
                    </Detail.Metadata.TagList>
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
          />
        </ActionPanel>
      }
      accessories={props?.time ? [{ text: props.pretty_date }] : [{ text: props.pretty_date, icon: Icon.Calendar }]}
    />
  );
};
