import { List } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Course } from "./components/course";
import { Assignment } from "./components/assignment";
import { Announcement } from "./components/announcement";
import { EmptyView } from "./components/error-view";
import { checkApi, getCourses, getAnnouncements, getDatedFeed } from "./utils/api";
import { course, announcement, assignment, plannernote, datefeed } from "./utils/types";
import { Error } from "./utils/utils";

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
        const courses = await getCourses(json, { noAssignments: true });
        setCourses(courses);
        const feedItems = await getDatedFeed(courses);
        setFeedItems(feedItems);
        console.log(feedItems.map((item) => item.items.map((a) => a.submission)));
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
        <List.Dropdown tooltip="Select filters" storeValue={true} onChange={setFilter}>
          <List.Dropdown.Section title="Filters">
            <List.Dropdown.Item title="All assignments" value="all" />
            <List.Dropdown.Item title="To-do" value="todo" />
            <List.Dropdown.Item title="Missing" value="missing" />
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
                    filter == "all"
                )
                .filter(
                  (feedItem: plannernote) =>
                    feedItem.custom_type == "announcement" || feedItem.custom_type == "assignment"
                )
                .map((feedItem: plannernote) =>
                  feedItem.custom_type == "announcement" ? (
                    <Announcement key={feedItem.custom_object.id} {...feedItem.announcement} />
                  ) : (
                    <Assignment
                      submitted={feedItem.submission.submitted}
                      key={feedItem.custom_object.id}
                      {...feedItem.assignment}
                    />
                  )
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
