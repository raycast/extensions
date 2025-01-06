import { Action, ActionPanel, Color, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { ApiResponse, OnThisDayJson, WikipediaOnThisDay, WikipediaPage, WikipediaPageJson } from "./types";
import { useEffect, useState } from "react";

import fetch from "node-fetch";
import { validDates } from "./valid-dates";

function detailViewOfOnThisDay(onThisDay: WikipediaOnThisDay, date: Date) {
  const dateMarkdown = "## " + dateGetMonthAndDay(date) + ", " + onThisDay.year.toString();
  const eventDetails = "### " + onThisDay.eventDescription;
  const relatedArticlesMarkdown = "### " + `Related Articles (${onThisDay.pages.length.toString()})`;
  const pageDataMarkdown = onThisDay.pages
    .map(
      (page: WikipediaPage) =>
        `### [${page.title}](${page.pageUrl})
        \n\n${page.extract}
        \n\n![Image](${page.imageUrl})\n`,
    )
    .join("\n---\n");

  return (
    <Detail markdown={dateMarkdown + "\n" + eventDetails + "\n" + relatedArticlesMarkdown + "\n" + pageDataMarkdown} />
  );
}

function dateGetMonthAndDay(date: Date) {
  const monthString = date.toLocaleString("default", { month: "long" });
  const day = date.getDate();
  return `${monthString} ${day}`;
}

function WikipediaOnThisDayListItem({ story, date }: { story: WikipediaOnThisDay; date: Date }) {
  return (
    <List.Item
      key={story.eventDescription}
      title={story.eventDescription}
      accessories={[
        { tag: story.year.toString() },
        { tag: { value: story.pages.length.toString(), color: Color.Blue }, icon: Icon.Document },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={detailViewOfOnThisDay(story, date)} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [wikipediaStories, setWikipediaStories] = useState<WikipediaOnThisDay[]>([]);
  const [error, setError] = useState<Error>();
  const [date, setDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function getWikipediaStories() {
      try {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const response = await fetch(`https://api.wikimedia.org/feed/v1/wikipedia/en/featured/${year}/${month}/${day}`);
        const data = (await response.json()) as ApiResponse;
        const onThisDay = data.onthisday;
        const wikipediaPages: WikipediaOnThisDay[] = onThisDay.map((item: OnThisDayJson) => {
          const subpages: WikipediaPage[] = item.pages.map((subItem: WikipediaPageJson) => ({
            title: subItem.normalizedtitle,
            extract: subItem.extract,
            pageUrl: subItem.content_urls.desktop.page,
            imageUrl: subItem.thumbnail?.source || "",
          }));
          setIsLoading(false);
          return {
            year: item.year,
            eventDescription: item.text,
            pages: subpages,
          };
        });

        setWikipediaStories(wikipediaPages);
      } catch (error) {
        setError(new Error("Error loading Wikipedia stories" + error));
        console.error("Error loading Wikipedia stories", error);
      }
    }

    if (error) {
      showToast(Toast.Style.Failure, "Failed to load Wikipedia stories", error.message);
    } else {
      getWikipediaStories();
    }
  }, [error, date]);

  function dateChanged(newDate: string): void {
    setIsLoading(true);
    setError(undefined);
    setDate(new Date(newDate));
  }

  return (
    <List
      isLoading={!error && isLoading}
      navigationTitle="Wikipedia On This Day"
      searchBarPlaceholder="Filter stories by title..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select a date (MM/DD)"
          defaultValue={date.toDateString()}
          onChange={(newDate) => dateChanged(newDate)}
        >
          {validDates.map((date) => (
            <List.Dropdown.Item
              title={date.toDateString().substring(4, 11) + "(" + (date.getMonth() + 1) + "/" + date.getDate() + ")"}
              value={date.toDateString()}
            />
          ))}
        </List.Dropdown>
      }
    >
      {isLoading && !error && <List.EmptyView title="Loading..." />}
      {!isLoading && error && <List.EmptyView title="An error occurred" key={error.message} />}
      {!isLoading && !error && (
        <List.Section title={dateGetMonthAndDay(date)}>
          {wikipediaStories.map((story) => (
            <WikipediaOnThisDayListItem key={story.eventDescription} story={story} date={date} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
