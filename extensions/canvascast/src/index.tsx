import { List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Course } from "./components/course";
import { Assignment } from "./components/assignment";
import { Announcement } from "./components/announcement";
import { EmptyView } from "./components/error-view";
import { checkApi, getCourses } from "./utils/api";
import { course, announcement, assignment } from "./utils/types";
import { Error } from "./utils/utils";

export default function main() {
  const [courses, setCourses] = useState<course[]>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState(Error.INVALID_API_KEY);

  useEffect(() => {
    checkApi().then((json) => {
      if (json.status == "unauthenticated" || !(json instanceof Array)) {
        setError(Error.INVALID_API_KEY);
        setCourses(undefined);
        setIsLoading(false);
      } else {
        getCourses(json)
          .then((courses) => {
            setCourses(courses);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error(error);
            setError(Error.INVALID_DOMAIN);
            setCourses(undefined);
            setIsLoading(false);
          });
      }
    });
  }, []);

  return (
    <List isLoading={isLoading}>
      {courses !== undefined ? (
        <React.Fragment>
          <List.Section title="Courses">
            {!isLoading && courses.map((course, index) => <Course key={index} course={course} />)}
          </List.Section>
          <List.Section title="Assignments">
            {!isLoading &&
              courses.map((course: course) =>
                course.assignments?.map((assignment: assignment) => <Assignment key={assignment.id} {...assignment} />)
              )}
          </List.Section>
          <List.Section title="Announcements">
            {!isLoading &&
              courses.map((course: course) =>
                course.announcements?.map((announcement: announcement) => (
                  <Announcement key={announcement.id} {...announcement} />
                ))
              )}
          </List.Section>
        </React.Fragment>
      ) : (
        <EmptyView error={error} />
      )}
    </List>
  );
}
