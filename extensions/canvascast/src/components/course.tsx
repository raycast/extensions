import { List, Action, ActionPanel, Color, getPreferenceValues } from "@raycast/api";
import { course, announcement, Preferences } from "../utils/types";
import { Modules } from "./modules";
import { Assignment } from "./assignment";
import { Announcement } from "./announcement";
import { Icons } from "../utils/utils";

export const Course = (props: { course: course; announcements: announcement[] }) => {
  const preferences: Preferences = getPreferenceValues();

  return (
    <List.Item
      title={props.course.name}
      icon={{ source: Icons["Course"], tintColor: props.course.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="See Modules"
            icon={{ source: Icons["Modules"], tintColor: Color.PrimaryText }}
            target={<Modules id={props.course.id} url={`https://${preferences.domain}/courses/${props.course.id}`} />}
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://${preferences.domain}/courses/${props.course.id}`}
          />
          <ActionPanel.Section>
            <Action.Push
              title="See Assignments"
              icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <List>
                  {props.course.assignments.map((assignment: any, index: number) => (
                    <Assignment key={index} {...assignment} />
                  ))}
                </List>
              }
            />
            <Action.Push
              title="See Announcements"
              icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
              target={
                <List>
                  {props.announcements
                    .filter((announcement: any) => announcement.course_id === props.course.id)
                    .map((announcement: any, index: number) => (
                      <Announcement key={index} {...announcement} />
                    ))}
                </List>
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
