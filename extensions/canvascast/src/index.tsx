import { List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Course } from "./components/course";
import { Assignment } from "./components/assignment";
import { Announcement } from "./components/announcement";
import { EmptyView } from "./components/error-view";
import { checkApi, getCourses, getAssignments, getAnnouncements } from "./utils/api";
import { course, announcement } from "./utils/types";
import { Error } from "./utils/utils";

export default function main() {
  const [courses, setCourses] = useState<course[]>();
  const [announcements, setAnnouncements] = useState<announcement[]>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState(Error.INVALID_API_KEY);

  useEffect(() => {
    const getItems = async () => {
      try {
        const json = await checkApi();
        if (json.status == "unauthenticated" || !(json instanceof Array)) {
          setCourses(null);
          setIsLoading(false);
          setError(Error.INVALID_API_KEY);
          return;
        }
        const courses = await getCourses(json);
        const assignments = await getAssignments(courses);
        const announcements = await getAnnouncements(courses);
        courses.forEach((course: course, index: number) => {
          course.assignments = assignments[index];
        });
        setCourses(courses);
        setAnnouncements(announcements);
        setIsLoading(false);
      } catch {
        setCourses(null);
        setIsLoading(false);
        setError(Error.INVALID_DOMAIN);
      }
    };
    getItems();
  }, []);

  return (
    <List isLoading={isLoading}>
      {courses !== null ? (
        <React.Fragment>
          <List.Section title="Courses">
            {!isLoading &&
              courses.map((course, index) => <Course key={index} course={course} announcements={announcements} />)}
          </List.Section>
          <List.Section title="Assignments">
            {!isLoading &&
              courses.map((course: any) =>
                course.assignments?.map((assignment: any) => <Assignment key={assignment.id} {...assignment} />)
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
