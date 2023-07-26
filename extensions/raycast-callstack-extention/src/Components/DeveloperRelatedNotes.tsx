import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

import { NotesDbFields } from "../utils/constants";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { NotionPropertiesResponse } from "../utils/types";

type Note = {
  id: string;
  name: string;
  url: string;
  date: string;
};

export default function DeveloperRelatedNotes({ developerId }: { developerId: string }) {
  const preferences = getPreferenceValues();

  const [search, setSearch] = useState<string>("");

  const { isLoading, data } = useCachedPromise(
    async (developerId: string) => {
      const notionClient = new Client({ auth: preferences.NotionKey });

      // Search notion interview notes
      const notionData = await notionClient.databases.query({
        database_id: preferences.NotesDbId,
        page_size: 10,
        filter: {
          property: NotesDbFields.relatedDeveloper,
          relation: {
            contains: developerId,
          },
        },
      });

      const notes: Note[] = notionData.results?.map((dbItem) => {
        const item = dbItem as PageObjectResponse;
        const properties = item.properties as NotionPropertiesResponse;
        return {
          id: item.id,
          name: properties?.[NotesDbFields.name]?.title?.[0]?.plain_text || "",
          date: new Date(properties?.[NotesDbFields.date]?.created_time || "").toLocaleString(),
          url: item.url,
        };
      });

      return notes;
    },
    [developerId],
    { keepPreviousData: true }
  );

  return (
    <List searchText={search} onSearchTextChange={setSearch} isShowingDetail isLoading={isLoading} throttle>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          icon="note"
          title={item.name || ""}
          actions={
            <ActionPanel>
              <Action.Open
                icon="notion-logo.png"
                title="Open in Notion"
                target={item.url?.replace("https", "notion")}
              />
            </ActionPanel>
          }
          detail={<NoteDetail id={item.id} date={item.date} name={item.name} notionKey={preferences.NotionKey} />}
        />
      ))}
    </List>
  );
}

function NoteDetail({ id, notionKey, date, name }: { id: string; date: string; notionKey: string; name: string }) {
  const { isLoading, data } = useCachedPromise(
    async (noteId: string) => {
      const notionClient = new Client({ auth: notionKey });

      const n2m = new NotionToMarkdown({ notionClient });

      const mdblocks = await n2m.pageToMarkdown(noteId);
      const mdString = n2m.toMarkdownString(mdblocks);
      return mdString.parent;
    },
    [id],
    { keepPreviousData: true }
  );
  return <List.Item.Detail markdown={`# ${name}\n> ${date}\n${data}`} isLoading={isLoading} />;
}
