import { getPreferenceValues, List, showToast, Toast, Color } from "@raycast/api";
import { ModulesItem } from "./components/modules-item";
import { Assignment } from "./components/assignment";
import { Announcement } from "./components/announcement";
import { EmptyView } from "./components/error-view";
import { course, announcement, Preferences } from "./utils/types";
import { Colors, Error } from "./utils/utils";
import { api as getApi } from "./api";
import React, { useEffect, useState } from "react";
import TurndownService from "turndown-rn";

const service = new TurndownService();

export default function main() {
  const preferences: Preferences = getPreferenceValues();
  const api = getApi(preferences.token, preferences.domain);

  const [courses, setCourses] = useState<course[]>([]);
  const [announcements, setAnnouncements] = useState<announcement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(Error.INVALID_API_KEY);

  useEffect(() => {
    api["courses?state=available&enrollment_state=active"]
      .get()
      .then((json: any) => {
        if (json.status == "unauthenticated" || !(json instanceof Array)) {
          setCourses(null);
          setIsLoading(false);
          setError(Error.INVALID_API_KEY);
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
                color: Colors[i % Colors.length],
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
                      color: Colors[i % Colors.length],
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
                          Colors[
                            courses.indexOf(
                              courses.filter((course: any) => course.id == a.context_code.substring(7))[0]
                            ) % Colors.length
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
        setError(Error.INVALID_DOMAIN);
      });
  }, []);

  return (
    <List isLoading={isLoading}>
      {courses !== null ? (
        <React.Fragment>
          <List.Section title="Courses">
            {!isLoading &&
              courses?.map((course, index) => (
                <ModulesItem key={index} course={course} announcements={announcements} />
              ))}
          </List.Section>
          <List.Section title="Assignments">
            {!isLoading &&
              courses?.map((course: any) =>
                course.assignments.map((assignment: any) => <Assignment key={assignment.id} {...assignment} />)
              )}
          </List.Section>
          <List.Section title="Announcements">
            {!isLoading && announcements?.map((announcement, index) => <Announcement key={index} {...announcement} />)}
          </List.Section>
        </React.Fragment>
      ) : (
        <EmptyView error={error} />
      )}
    </List>
  );
}
