import {
  getPreferenceValues,
  List,
  PushAction,
  OpenInBrowserAction,
  CopyToClipboardAction,
  PasteAction,
  ActionPanel,
  showToast,
  ToastStyle,
  Icon,
  Color,
} from "@raycast/api";
import { api as getApi } from "./api";
import { useEffect, useState } from "react";

const Colors = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];

const Icons = {
  Announcement: "../assets/announcement.png",
  Assignment: "../assets/assignment.png",
  Code: "../assets/code.png",
  Course: "../assets/course.png",
  ExternalUrl: Icon.Link,
  File: Icon.TextDocument,
  Page: "../assets/page.png",
  Passcode: "../assets/check-lock.png",
  Quiz: "../assets/quiz.png",
};

const fileTypes = [
  ".c",
  ".cs",
  ".cpp",
  ".h",
  ".hpp",
  ".css",
  ".go",
  ".html",
  ".java",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".kt",
  ".sql",
  ".php",
  ".py",
  ".ipynb",
  ".csv",
];

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

  const [loading, setLoading] = useState(true);

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
              courses.map((a: any) => ({
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
                  .catch((err: any) => {
                    showToast(ToastStyle.Failure, `Error: ${err.message}`);
                  });
                setLoading(false);
              })
              .catch((err: any) => {
                showToast(ToastStyle.Failure, `Error: ${err.message}`);
              });
          })
          .catch((err: any) => {
            showToast(ToastStyle.Failure, `Error: ${err.message}`);
          });
      })
      .catch((err: any) => {
        showToast(ToastStyle.Failure, `Error: ${err.message}`);
      });
  }, []);

  return (
    <List isLoading={loading}>
      <List.Section title="Courses">
        {items?.map((item, index) => (
          <List.Item
            key={index}
            title={item.name}
            icon={{ source: Icons["Course"], tintColor: Color[Colors[index % Colors.length]] }}
            actions={
              <ActionPanel>
                <PushAction
                  title="See Modules"
                  target={
                    <ModulePage id={item.id} url={`https://${preferences.domain}/courses/${item.id}`} api={api} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Assignments">
        {assignments?.map((assignment, index) => (
          <List.Item
            key={index}
            title={assignment.name}
            subtitle={assignment.course}
            icon={{ source: Icons["Assignment"], tintColor: assignment.color }}
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
      <List.Section title="Announcements">
        {announcements?.map((announcement, index) => (
          <List.Item
            key={index}
            title={announcement.title}
            subtitle={announcement.course}
            icon={{ source: Icons["Announcement"], tintColor: announcement.color }}
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

const ModulePage = (props: { id: any; url: string; api: any }) => {
  const [modules, setModules]: any = useState();
  const [isLoading, setIsLoading]: any = useState(true);

  useEffect(() => {
    props.api.courses[props.id].modules
      .get()
      .then((json: any) => {
        const promises = json
          .map((module: any) => module.id)
          .map((id: any) => {
            return props.api.courses[props.id].modules[id].items
              .get()
              .then((items: any) => {
                items = items.filter((item: any) => item.type !== "SubHeader");
                return items.map((item: any) => ({
                  name: item.title
                    .replace(/\s\(.*/g, "")
                    .replace(/\s?:.*/g, "")
                    .replace(/PM/g, "pm"),
                  passcode: item.title.match(/Passcode: \S{9,10}/g)?.[0].substring(10),
                  type: item.type,
                  url: item.html_url,
                }));
              })
              .catch((err: any) => {
                showToast(ToastStyle.Failure, `Error: ${err.message}`);
              });
          });
        Promise.all(promises)
          .then((items: any) => {
            const modules = json.map((module: any, index: number) => {
              return {
                name: module.name,
                id: module.id,
                url: module.url,
                items: items[index],
              };
            });
            setModules(modules);
            setIsLoading(false);
          })
          .catch((err: any) => {
            showToast(ToastStyle.Failure, `Error: ${err.message}`);
          });
      })
      .catch((err: any) => {
        showToast(ToastStyle.Failure, `Error: ${err.message}`);
      });
  }, []);

  const isCodeFile = (file: string) => {
    let isCodeFile = false;
    for (const type of fileTypes) {
      if (file.endsWith(type)) {
        isCodeFile = true;
        break;
      }
    }
    return isCodeFile;
  };

  return (
    <List isLoading={isLoading}>
      {modules?.map((module: any, index: number) => (
        <List.Section title={module.name} key={index}>
          {module.items?.map((element: any, key: number) => (
            <List.Item
              title={element.name}
              key={key}
              icon={{
                source: isCodeFile(element.name)
                  ? Icons["Code"]
                  : element.passcode
                  ? Icons["Passcode"]
                  : element.type in Icons
                  ? Icons[element.type]
                  : Icon.ExclamationMark,
              }}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction title="Open in Browser" url={element.url} icon={{ source: Icon.Link }} />
                  {element.passcode && <CopyToClipboardAction title="Copy Passcode" content={element.passcode} />}
                  {element.passcode && (
                    <PasteAction
                      title="Paste Passcode"
                      content={element.passcode}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && (modules?.length === 0 || modules[0].items?.length === 0) && (
        <List.Item
          title="Open Home Page"
          icon={{ source: Icon.Link }}
          actions={
            <ActionPanel>
              <OpenInBrowserAction title="Open in Browser" url={props.url} icon={{ source: Icon.Link }} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};
