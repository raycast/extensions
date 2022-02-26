import { getPreferenceValues, List, OpenInBrowserAction, ActionPanel, Icon, Color } from "@raycast/api";
import { api as getApi } from "./api";
import { useEffect, useState } from "react";

const Colors = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];

interface Preferences {
  token: string;
  domain: string;
}

interface course {
  name: string;
  code: string;
  id: number;
}

interface assignment {
  name: string;
  color: string;
  course_id: number;
  id: number;
  course: string;
}

interface announcement {
  course_id: number;
  title: string;
  color: string;
  course: string;
  id: number;
}

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const api = getApi(preferences.token, preferences.domain);
  const [items, setItems] = useState<course[]>();
  const [assignments, setAssignments] = useState<assignment[]>();
  const [announcements, setAnnouncements] = useState<announcement[]>();

  useEffect(() => {
    api["courses?state=available&enrollment_state=active"]
      .get()
      .then((json: any) => {
        if (json.stauts == "unauthenticated" || !(json instanceof Array))
          setAssignments([
            {
              name: "Invalid API key",
              course: "CanvasCast",
              course_id: 0,
              id: 0,
              color: "Green",
            },
          ]);
        api.users.self.favorites["courses?state=available&enrollment_state=active"]
          .get()
          .then((favorites: any) => {
            let courses = json;
            const ids = favorites.map((favorite) => favorite.id);
            courses = courses.filter((course) => ids.includes(course.id));
            setItems(
              json.map((a: any) => ({
                name: a.name,
                code: a.course_code,
                id: a.id,
              }))
            );
            api.users.self.todo
              .get()
              .then((json: any[]) => {
                setAssignments(
                  json.map((a) => ({
                    name: a.assignment.name,
                    course: courses.filter((course: any) => course.id == a.course_id)[0].name,
                    course_id: a.course_id,
                    id: a.assignment.id,
                    color:
                      Color[
                        Colors[courses.indexOf(courses.filter((course) => course.id == a.course_id)[0]) % Colors.length]
                      ],
                  }))
                );
                api["announcements?" + courses.map((a) => "context_codes[]=course_" + a.id).join("&")]
                  .get()
                  .then((json: any[]) => {
                    setAnnouncements(
                      json.map((a) => ({
                        title: a.title,
                        course_id: +a.context_code.substring(7),
                        color:
                          Color[
                            Colors[
                              courses.indexOf(
                                courses.filter((course: any) => course.id == a.context_code.substring(7))[0]
                              ) % Colors.length
                            ]
                          ],
                        course: courses.filter((course) => course.id == a.context_code.substring(7))[0].name,
                        id: a.id,
                      }))
                    );
                  })
                  .catch(() => {
                    // ignore error?
                  });
              })
              .catch(() => {
                // ignore error?
              });
          })
          .catch(() => {
            // ignore error?
          });
      })
      .catch(() => {
        // ignore error?
      });
  });

  return (
    <List isLoading={items === undefined}>
      <List.Section title="Courses" subtitle="Your enrolled courses">
        {items?.map((item, index) => (
          <List.Item
            key={index}
            title={item.name}
            subtitle={item.code}
            icon={{ source: Icon.Pin, tintColor: Color[Colors[index % Colors.length]] }}
            actions={
              <ActionPanel title="Title">
                <OpenInBrowserAction url={"https://" + preferences.domain + "/courses/" + item.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Assignments" subtitle="Your assignments">
        {assignments?.map((assignment, index) => (
          <List.Item
            key={index}
            title={assignment.name}
            subtitle={assignment.course}
            icon={{ source: Icon.TextDocument, tintColor: assignment.color }}
            actions={
              <ActionPanel title="Title">
                <OpenInBrowserAction
                  url={
                    "https://" +
                    preferences.domain +
                    "/courses/" +
                    assignment.course_id +
                    "/assignments/" +
                    assignment.id
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Announcements" subtitle="Your announcements">
        {announcements?.map((announcement, index) => (
          <List.Item
            key={index}
            title={announcement.title}
            subtitle={announcement.course}
            icon={{ source: Icon.Message, tintColor: announcement.color }}
            actions={
              <ActionPanel title="Title">
                <OpenInBrowserAction
                  url={
                    "https://" +
                    preferences.domain +
                    "/courses/" +
                    announcement.course_id +
                    "/discussion_topics/" +
                    announcement.id
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
