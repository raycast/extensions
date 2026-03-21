import { ActionPanel, Action, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchJson } from "./utils/api";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { oauthService } from "./utils/oauth";
import { APP_URL, DEFAULT_MEETING_NAME } from "./constants/raycast";

type MeetingSearchResult = {
  id: number;
  name: string;
  createdAt: string | Date;
};

type SearchResponse = {
  meetings?: { result: MeetingSearchResult[] };
};

const SearchMeetings = () => {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchedMeetings, setSearchedMeetings] = useState<
    MeetingSearchResult[]
  >([]);

  useEffect(() => {
    let canceled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchText) params.set("searchTerm", searchText);
        const data = await fetchJson<SearchResponse>(
          `/api/search?${params.toString()}`,
        );
        if (!canceled) setSearchedMeetings(data.meetings?.result ?? []);
      } catch (error) {
        showFailureToast(error, {
          title: "Something went wrong.",
        });
        if (!canceled) setSearchedMeetings([]);
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };
    run();
    return () => {
      canceled = true;
    };
  }, [searchText]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search meetings…"
    >
      {searchedMeetings.map((meeting) => (
        <List.Item
          key={meeting.id}
          icon="fire.svg"
          title={meeting.name ?? DEFAULT_MEETING_NAME}
          accessories={
            meeting.createdAt
              ? [{ text: new Date(meeting.createdAt).toLocaleDateString() }]
              : []
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`${APP_URL}/meetings/${meeting.id}`} />
              <Action.CopyToClipboard
                content={`${APP_URL}/meetings/${meeting.id}`}
                title="Copy Link"
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};

export default withAccessToken(oauthService)(SearchMeetings);
