import { List, Action, ActionPanel, Color, getPreferenceValues } from "@raycast/api";
import { course, announcement, Preferences, assignment } from "../utils/types";
import { Modules } from "./modules";
import { Assignment } from "./assignment";
import { Announcement } from "./announcement";
import { Icons } from "../utils/utils";

export const Course = (props: { course: course }) => {
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
              target={
                <List>
                  {props.course.assignments.map((assignment: assignment) => (
                    <Assignment key={assignment.id} assignment={assignment} />
                  ))}
                </List>
              }
            />
            <Action.Push
              title="See Announcements"
              icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
              target={
                <List>
                  {props.course.announcements.map((announcement: announcement) => (
                    <Announcement key={announcement.id} announcement={announcement} />
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
