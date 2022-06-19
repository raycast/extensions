import { getPreferenceValues, List, ActionPanel, Action, showToast, Toast, Icon, Color, Detail } from "@raycast/api";
import { api as getApi } from "./api";
import { useEffect, useState } from "react";
import open from "open";
import TurndownService from "turndown-rn";

const Colors = ["Red", "Orange", "Yellow", "Green", "Blue", "Purple"];

const Icons = {
  Announcement: "../assets/announcement.png",
  Assignment: "../assets/assignment.png",
  Code: "../assets/code.png",
  Course: "../assets/course.png",
  ExternalUrl: Icon.Link,
  File: Icon.TextDocument,
  InvalidAPIKey: "../assets/invalid-api-key.png",
  InvalidDomain: "../assets/invalid-domain.png",
  Modules: "../assets/see-modules.png",
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
  color: Color;
  assignments: assignment[];
}

interface assignment {
  name: string;
  id: number;
  description: string;
  date: any;
  course: string;
  course_id: number;
  color: Color;
}

interface announcement {
  course_id: number;
  title: string;
  color: string;
  course: string;
  id: number;
  markdown: string;
  date: any;
}

enum ERROR {
  INVALID_API_KEY = 0,
  INVALID_DOMAIN = 1,
}

const service = new TurndownService();

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const api = getApi(preferences.token, preferences.domain);

  const [courses, setCourses] = useState<course[]>([]);
  const [announcements, setAnnouncements] = useState<announcement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(ERROR.INVALID_API_KEY);

  useEffect(() => {
    api["courses?state=available&enrollment_state=active"]
      .get()
      .then((json: any) => {
        if (json.status == "unauthenticated" || !(json instanceof Array)) {
          setCourses(null);
          setIsLoading(false);
          setError(ERROR.INVALID_API_KEY);
          return;
        }
        api.users.self.favorites["courses?state=available&enrollment_state=active"]
          .get()
          .then((favorites: any) => {
            const ids = favorites.map((favorite) => favorite.id);
            const courses = json
              .filter((course) => ids.includes(course.id))
              .map((a: any, i: number) => ({
                name: a.name,
                code: a.course_code,
                id: a.id,
                color: Color[Colors[i % Colors.length]],
                assignments: [],
              }));
            const promises = courses.map((course: any, i: number) => {
              return api.courses[course.id].assignments["?order_by=due_at"]
                .get()
                .then((json: any) => {
                  return json
                    .filter((a: any) => a.due_at && new Date(a.due_at).getTime() > Date.now())
                    .map((a: any) => ({
                      name: a.name,
                      id: a.id,
                      description: `# ${a.name}\n\n` + service.turndown(a.description),
                      date: new Date(a.created_at).toString().split(" ").slice(0, 4).join(" "),
                      course: course.name,
                      course_id: course.id,
                      color: Color[Colors[i % Colors.length]],
                    }));
                })
                .catch((err: any) => {
                  showToast(Toast.Style.Failure, `Error: ${err.message}`);
                });
            });
            Promise.all(promises)
              .then((assignments) => {
                courses.forEach((course: any, i: number) => {
                  course.assignments = assignments[i];
                });
                setCourses(courses);
                api["announcements?" + courses.map((a) => "context_codes[]=course_" + a.id).join("&")]
                  .get()
                  .then((json: any) => {
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
                        markdown: `# ${a.title}\n\n` + service.turndown(a.message),
                        date: new Date(a.created_at).toString().split(" ").slice(0, 4).join(" "),
                      }))
                    );
                    setIsLoading(false);
                  })
                  .catch((err: any) => {
                    showToast(Toast.Style.Failure, `Error: ${err.message}`);
                  });
              })
              .catch((err: any) => {
                showToast(Toast.Style.Failure, `Error: ${err.message}`);
              });
          })
          .catch((err: any) => {
            showToast(Toast.Style.Failure, `Error: ${err.message}`);
          });
      })
      .catch((err: any) => {
        setCourses(null);
        setIsLoading(false);
        setError(ERROR.INVALID_DOMAIN);
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {courses !== null ? (
        <>
          <List.Section title="Courses">
            {!isLoading &&
              courses?.map((course, index) => (
                <ModuleItem
                  key={index}
                  course={course}
                  announcements={announcements}
                  preferences={preferences}
                  api={api}
                />
              ))}
          </List.Section>
          <List.Section title="Assignments">
            {!isLoading &&
              courses?.map((course: any) =>
                course.assignments.map((assignment: any) => (
                  <Assignment key={assignment.id} assignment={assignment} preferences={preferences} />
                ))
              )}
          </List.Section>
          <List.Section title="Announcements">
            {!isLoading &&
              announcements?.map((announcement, index) => (
                <Announcement key={index} announcement={announcement} preferences={preferences} />
              ))}
          </List.Section>
        </>
      ) : (
        <List.EmptyView
          icon={{
            source:
              error === ERROR.INVALID_API_KEY
                ? Icons["InvalidAPIKey"]
                : error === ERROR.INVALID_DOMAIN
                ? Icons["InvalidDomain"]
                : Icon.ExclamationMark,
          }}
          title={
            error === ERROR.INVALID_API_KEY
              ? "Invalid API Key"
              : error === ERROR.INVALID_DOMAIN
              ? "Invalid Domain"
              : "Error"
          }
          description={`Please check your ${
            error === ERROR.INVALID_API_KEY
              ? "API key"
              : error === ERROR.INVALID_DOMAIN
              ? "domain"
              : "API key or domain"
          } and try again.`}
        />
      )}
    </List>
  );
}

const Modules = (props: { id: any; url: string; api: any }) => {
  const [modules, setModules]: any = useState();
  const [isLoading, setIsLoading]: any = useState(true);

  useEffect(() => {
    props.api.courses[props.id].modules["?include=items"]
      .get()
      .then((json: any) => {
        const modules = json.map((module: any) => {
          const items = module.items
            .filter((item: any) => item.type !== "SubHeader")
            .map((item: any) => ({
              id: item.content_id,
              name: item.title
                .replace(/\s\(.*/g, "")
                .replace(/\s?:.*/g, "")
                .replace(/PM/g, "pm"),
              passcode: item.title.match(/Passcode: \S{9,10}/g)?.[0].substring(10),
              type: item.type,
              url: item.html_url,
            }));

          return {
            name: module.name,
            id: module.id,
            url: module.url,
            items: items,
          };
        });
        const promises = [];
        modules.map((module) => {
          module.items
            .filter((item) => item.type === "File")
            .map((item) => {
              promises.push(
                props.api.courses[props.id].files[item.id].get().then((json: any) => {
                  return json.url;
                })
              );
            });
        });
        Promise.all(promises).then((urls: any) => {
          let i = 0;
          modules.map((module) => {
            module.items.map((item) => {
              if (item.type === "File") {
                item.download = urls[i];
                i++;
              }
            });
          });
          setModules(modules);
          setIsLoading(false);
        });
      })
      .catch((err: any) => {
        showToast(Toast.Style.Failure, `Error: ${err.message}`);
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
                  <Action.OpenInBrowser title="Open in Browser" url={element.url} icon={{ source: Icon.Link }} />
                  {element.download && (
                    <Action
                      title="Download File"
                      onAction={async () => {
                        // showToast(Toast.Style.Success, "Downloading File...");
                        await open(element.download, { background: true });
                        // showToast(Toast.Style.Success, "File Downloaded");
                      }}
                      icon={{ source: Icon.Download }}
                    />
                  )}
                  {element.passcode && <Action.CopyToClipboard title="Copy Passcode" content={element.passcode} />}
                  {element.passcode && (
                    <Action.Paste
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
              <Action.OpenInBrowser title="Open in Browser" url={props.url} icon={{ source: Icon.Link }} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

const ModuleItem = (props: { course: course; announcements: announcement[]; preferences: any; api: any }) => {
  return (
    <List.Item
      title={props.course.name}
      icon={{ source: Icons["Course"], tintColor: props.course.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="See Modules"
            icon={{ source: Icons["Modules"], tintColor: Color.PrimaryText }}
            target={
              <Modules
                id={props.course.id}
                url={`https://${props.preferences.domain}/courses/${props.course.id}`}
                api={props.api}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`https://${props.preferences.domain}/courses/${props.course.id}`}
          />
          <ActionPanel.Section>
            <Action.Push
              title="See Assignments"
              icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <List>
                  {props.course.assignments.map((assignment: any, index: number) => (
                    <Assignment key={index} assignment={assignment} preferences={props.preferences} />
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
                      <Announcement key={index} announcement={announcement} preferences={props.preferences} />
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

const Assignment = (props: { assignment: assignment; preferences: any }) => {
  return (
    <List.Item
      title={props.assignment.name}
      subtitle={props.assignment.course}
      icon={{ source: Icons["Assignment"], tintColor: props.assignment.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Description"
            icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={props.assignment.description}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${props.preferences.domain}/courses/${props.assignment.course_id}/discussion_topics/${props.assignment.id}`}
                    />
                  </ActionPanel>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${props.preferences.domain}/courses/${props.assignment.course_id}/discussion_topics/${props.assignment.id}`}
          />
        </ActionPanel>
      }
      accessories={[{ text: props.assignment.date, icon: Icon.Calendar }]}
    />
  );
};

const Announcement = (props: { announcement: announcement; preferences: any }) => {
  return (
    <List.Item
      title={props.announcement.title}
      subtitle={props.announcement.course}
      icon={{ source: Icons["Announcement"], tintColor: props.announcement.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Announcement"
            icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={props.announcement.markdown}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${props.preferences.domain}/courses/${props.announcement.course_id}/discussion_topics/${props.announcement.id}`}
                    />
                  </ActionPanel>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${props.preferences.domain}/courses/${props.announcement.course_id}/discussion_topics/${props.announcement.id}`}
          />
        </ActionPanel>
      }
      accessories={[{ text: props.announcement.date, icon: Icon.Calendar }]}
    />
  );
};
