import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { announcement, Preferences, apiAnnouncement } from "../utils/types";
import { Icons, convertHTMLToMD, getFormattedTime } from "../utils/utils";
import { useState, useEffect } from "react";
import { api } from "../utils/api";

export const Announcement = ({ announcement }: { announcement: announcement }) => {
  const preferences: Preferences = getPreferenceValues();

  const [apiAnnouncement, setApiAnnouncement] = useState<apiAnnouncement>({ title: "", message: "", created_at: "" });
  useEffect(() => {
    async function load() {
      const apiAnnouncement = await api.courses[announcement.course_id].discussion_topics[announcement.id].get();
      setApiAnnouncement(apiAnnouncement);
    }
    load();
  }, []);

  return (
    <List.Item
      title={announcement.title}
      subtitle={announcement.course}
      icon={{ source: Icons["Announcement"], tintColor: announcement.color }}
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
                      url={`https://${preferences.domain}/courses/${announcement.course_id}/discussion_topics/${announcement.id}`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Posted"
                      text={new Date(announcement.date).toDateString() + " at " + getFormattedTime(announcement.date)}
                    />
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.TagList title="Course">
                      <Detail.Metadata.TagList.Item
                        text={announcement.course}
                        color={announcement.course_color ?? Color.PrimaryText}
                      />
                    </Detail.Metadata.TagList>
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${announcement.course_id}/discussion_topics/${announcement.id}`}
          />
        </ActionPanel>
      }
      accessories={
        announcement?.time
          ? [{ text: announcement.pretty_date }]
          : [{ text: announcement.pretty_date, icon: Icon.Calendar }]
      }
    />
  );
};
