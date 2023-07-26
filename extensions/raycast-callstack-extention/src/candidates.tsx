import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { useState, useCallback } from "react";
import fetch from "node-fetch";
import { Client } from "@notionhq/client";
import debounce from "lodash/debounce";

import { RECRUITEE_URL, InterviewNotesDbFields } from "./utils/constants";
import { NotionPropertiesResponse } from "./utils/types";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

type NotionCandidateResult = {
  name: string;
  url: string;
  id: string;
};

type RecruiteeCandidateResult = {
  name: string;
  id: string;
};

export default function Command() {
  const preferences = getPreferenceValues();
  const [recruiteeItems, setRecruiteeItems] = useState<RecruiteeCandidateResult[]>([]);
  const [notionItems, setNotionItems] = useState<NotionCandidateResult[]>([]);
  const notionClient = new Client({ auth: preferences.NotionKey });

  const handleSearch = async (text: string) => {
    // Search recruiteee
    const result = await fetch(
      `${RECRUITEE_URL}/search/new/candidates?limit=3&page=1&filters_json=%5B%7B%22field%22%3A%22all%22%2C%22query%22%3A%22${text}%22%7D%5D`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${preferences.RecruiteeToken}`,
        },
      }
    );
    const data = await result.json();
    const recruiteeItems: RecruiteeCandidateResult[] = data.hits?.map((item: RecruiteeCandidateResult) => ({
      name: item.name || "",
      id: item.id,
    }));
    setRecruiteeItems(recruiteeItems || []);

    // Search notion interview notes
    const notionResponse = await notionClient.databases.query({
      database_id: preferences.InterviewNotesDbId,
      page_size: 4,
      filter: {
        property: "Name",
        rich_text: {
          contains: text,
        },
      },
    });

    const notionItems: NotionCandidateResult[] = notionResponse?.results.map((dbItem) => {
      const item = dbItem as PageObjectResponse;
      return {
        name:
          (item?.properties as NotionPropertiesResponse)?.[InterviewNotesDbFields.name].title?.[0]?.plain_text || "",
        id: item.id,
        url: item.url,
      };
    });

    setNotionItems(notionItems);
  };

  const debouncedHandleSearch = useCallback(debounce(handleSearch, 300), []);

  return (
    <List onSearchTextChange={debouncedHandleSearch}>
      <List.Section title="Recruitee">
        {recruiteeItems.map((item) => (
          <List.Item
            key={item.id}
            icon="recruitee_logo.svg"
            title={item.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://app.recruitee.com/#/candidates?candidate=${item.id}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Interview notes">
        {notionItems.map((item) => (
          <List.Item
            key={item.id}
            icon="notion-logo.png"
            title={item.name || ""}
            actions={
              <ActionPanel>
                <Action.Open
                  icon="notion-logo.png"
                  title="Open in Notion"
                  target={item.url.replace("https", "notion")}
                />
                <Action.OpenInBrowser url={item.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
