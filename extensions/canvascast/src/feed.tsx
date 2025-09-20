import { List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Assignment } from "./components/assignment";
import { Announcement } from "./components/announcement";
import { Quiz } from "./components/quiz";
import { EmptyView } from "./components/error-view";
import { checkApi, getCourses, getDatedFeed } from "./utils/api";
import { course, plannernote, datefeed } from "./utils/types";
import { Error, Icons } from "./utils/utils";

export default function main() {
  const [feedItems, setFeedItems] = useState<datefeed[]>();
  const [courses, setCourses] = useState<course[]>();
  const [filter, setFilter] = useState<string>("all");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState(Error.INVALID_API_KEY);

  useEffect(() => {
    const getItems = async () => {
      try {
        const json = await checkApi();
        if (json.status == "unauthenticated" || !(json instanceof Array)) {
          setCourses(undefined);
          setIsLoading(false);
          setError(Error.INVALID_API_KEY);
          return;
        }
        const courses = await getCourses(json, { noAssignments: true, noAnnouncements: true });
        setCourses(courses);
        const feedItems = await getDatedFeed(courses);
        setFeedItems(feedItems);
        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setCourses(undefined);
        setIsLoading(false);
        setError(Error.INVALID_DOMAIN);
      }
    };
    getItems();
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select filters" storeValue={true} defaultValue="all" onChange={setFilter}>
          <List.Dropdown.Item title="All items" value="all" />
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="To-do" value="todo" icon={Icons.ToDo} />
            <List.Dropdown.Item title="Done" value="done" icon={Icons.Completed} />
            <List.Dropdown.Item title="Missing" value="missing" icon={Icons.Missing} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item title="Announcement" value="announcement" icon={Icons.Announcement} />
            <List.Dropdown.Item title="Assignment" value="assignment" icon={Icons.Assignment} />
            <List.Dropdown.Item title="Quiz" value="quiz" icon={Icons.Quiz} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {feedItems !== undefined ? (
        <React.Fragment>
          {feedItems.map((feedItem: datefeed) => (
            <List.Section
              title={feedItem.pretty_date}
              key={feedItem.pretty_date}
              {...(feedItem.today ? { subtitle: "Today" } : {})}
            >
              {feedItem.items
                .filter(
                  (feedItem: plannernote) =>
                    (filter == "missing" && feedItem.submission.missing) ||
                    (filter == "todo" && !feedItem.submission.submitted && feedItem.custom_type !== "announcement") ||
                    (filter == "done" && feedItem.submission.submitted && feedItem.custom_type !== "announcement") ||
                    (filter == "assignment" && feedItem.custom_type == "assignment") ||
                    (filter == "announcement" && feedItem.custom_type == "announcement") ||
                    (filter == "quiz" && feedItem.custom_type == "quiz") ||
                    filter == "all",
                )
                .filter(
                  (feedItem: plannernote) =>
                    feedItem.custom_type == "announcement" ||
                    feedItem.custom_type == "assignment" ||
                    feedItem.custom_type == "quiz",
                )
                .map((feedItem: plannernote) =>
                  feedItem.custom_type == "announcement" ? (
                    <Announcement
                      key={feedItem.custom_object.id}
                      announcement={{
                        ...feedItem.announcement,
                        course_color: courses.filter(
                          (course: course) => course.id == feedItem.custom_object.course_id,
                        )[0].color,
                      }}
                    />
                  ) : feedItem.custom_type == "assignment" ? (
                    <Assignment
                      key={feedItem.custom_object.id}
                      assignment={{
                        ...feedItem.assignment,
                        submitted: feedItem.submission.submitted,
                        special_missing: feedItem.submission.missing,
                        course_color: courses.filter(
                          (course: course) => course.id == feedItem.custom_object.course_id,
                        )[0].color,
                      }}
                    />
                  ) : (
                    <Quiz
                      key={feedItem.custom_object.id}
                      quiz={{
                        ...feedItem.quiz,
                        submitted: feedItem.submission.submitted,
                        special_missing: feedItem.submission.missing,
                        course_color: courses.filter(
                          (course: course) => course.id == feedItem.custom_object.course_id,
                        )[0].color,
                      }}
                    />
                  ),
                )}
            </List.Section>
          ))}
        </React.Fragment>
      ) : (
        <EmptyView error={error} />
      )}
    </List>
  );
}
