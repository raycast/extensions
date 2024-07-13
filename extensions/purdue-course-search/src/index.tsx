import { useCallback, useState } from "react";

import { ActionPanel, Action, List } from "@raycast/api";
import { useStreamJSON } from "@raycast/utils";

type SearchResultScheduleType = "Lecture" | "Distance Learning" | "Experiential" | "Laboratory" | "Individual Study";

type SearchResult = {
  id: string;
  title: string;
  subjectCode: string;
  courseCode: string;
  instructor: string[];
  description: string;
  capacity: number;
  credits: [number] | [number, number];
  term: string;
  crn: number[];
  sched: SearchResultScheduleType[];
};

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const searchResultsFilter = useCallback(
    (searchResult: SearchResult) => {
      if (!searchText) {
        return true;
      }

      const lowerSearchText = searchText.toLowerCase();
      return (
        searchResult.title.toLowerCase().includes(lowerSearchText) ||
        searchResult.subjectCode.toLowerCase().includes(lowerSearchText) ||
        searchResult.courseCode.toLowerCase().includes(lowerSearchText)
      );
    },
    [searchText],
  );

  const searchResultsTransform = useCallback((item: SearchResult): SearchResult => {
    return {
      ...item,
      id: `${item.subjectCode}${item.courseCode}`,
    };
  }, []);

  const { data, isLoading } = useStreamJSON(
    "https://boilerclasses.s3.us-east-2.amazonaws.com/data/classes_fall2024.json",
    {
      initialData: [] as SearchResult[],
      filter: searchResultsFilter,
      transform: searchResultsTransform,
    },
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Purdue classes..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult, index) => <SearchListItem key={index} searchResult={searchResult} />)}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={`${searchResult.subjectCode} ${searchResult.courseCode}`}
      subtitle={searchResult.title}
      // accessories={[{ text: searchResult.username }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open in Browser"
              url={`https://www.boilerclasses.com/detail/${searchResult.subjectCode}${searchResult.courseCode}${searchResult.title.replace(/\s/g, "")}`}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Course Code"
              content={`${searchResult.subjectCode} ${searchResult.courseCode}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
