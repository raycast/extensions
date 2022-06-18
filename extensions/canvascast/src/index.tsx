import {
  getPreferenceValues,
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Color,
  Detail,
} from "@raycast/api";
import { api as getApi } from "./api";
import { useEffect, useState } from "react";
import open from 'open'
import TurndownService from "turndown";


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
  message: string;
}

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const api = getApi(preferences.token, preferences.domain);
  const [courses, setCourses] = useState<course[]>();
  const [assignments, setAssignments] = useState<assignment[]>();
  const [announcements, setAnnouncements] = useState<announcement[]>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(true); 

  const service = new TurndownService();

  useEffect(() => {
    api["courses?state=available&enrollment_state=active"]
      .get()
      .then((json: any) => {
        if (json.status == "unauthenticated" || !(json instanceof Array)) {
          setCourses(null)
          setIsLoading(false)
          setError(true)
          return
        }
        api.users.self.favorites["courses?state=available&enrollment_state=active"]
          .get()
          .then((favorites: any) => {
            const ids = favorites.map((favorite) => favorite.id);
            const courses = json.filter((course) => ids.includes(course.id));
            setCourses(
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
                        message: `# ${a.title}\n\n` + service.turndown(a.message),
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
        setCourses(null)
        setIsLoading(false)
        setError(false)
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {courses !== null ? (<>
        <List.Section title="Courses">
          {courses?.map((item, index) => (
            <List.Item
              key={index}
              title={item.name}
              icon={{ source: Icons["Course"], tintColor: Color[Colors[index % Colors.length]] }}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="See Modules"
                    icon={{ source: Icons["Modules"], tintColor: Color.PrimaryText }}
                    target={
                      <Modules id={item.id} url={`https://${preferences.domain}/courses/${item.id}`} api={api} />
                    }
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={`https://${preferences.domain}/courses/${item.id}`} />
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
                  <Action.OpenInBrowser
                    url={`https://${preferences.domain}/courses/${assignment.course_id}/discussion_topics/${assignment.id}`}
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
                  <Action.Push
                    title="View Announcement"
                    icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
                    target={
                      <Detail 
                        markdown={announcement.message}
                        actions={
                          <ActionPanel>
                            <Action.OpenInBrowser
                              url={`https://${preferences.domain}/courses/${announcement.course_id}/discussion_topics/${announcement.id}`}
                            />
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  <Action.CopyToClipboard content={announcement.message} />
                  <Action.OpenInBrowser
                    url={`https://${preferences.domain}/courses/${announcement.course_id}/discussion_topics/${announcement.id}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      </>) : (
        <List.EmptyView 
          icon={{ source: error ? Icons["InvalidAPIKey"] : Icons["InvalidDomain"] }}
          title={ error ? "Invalid API Key" : "Invalid Domain"}
          description={`Please check your ${error ? "API key" : "domain"} and try again.`}
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
          let items = module.items
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
                        await open(element.download, {background: true});
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

