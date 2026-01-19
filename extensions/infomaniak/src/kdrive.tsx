import { useCachedPromise } from "@raycast/utils";
import { infomaniak, TINT_COLOR } from "./infomaniak";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AccountDrive } from "./types";
import { filesize } from "filesize";

export default function Drives() {
  const { isLoading, data: drives } = useCachedPromise(
    () => async (options) => {
      const { data, pages } = await infomaniak.drives.list({ page: options.page + 1 });
      return {
        data,
        hasMore: options.page < pages,
      };
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      <List.Section subtitle={`${drives.length}`}>
        {drives.map((drive) => (
          <List.Item
            key={drive.id}
            icon={Icon.HardDrive}
            title={drive.name}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.MagnifyingGlass} title="Search" target={<Search drive={drive} />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function Search({ drive }: { drive: AccountDrive }) {
  const [searchText, setSearchText] = useState("");
  const { isLoading, data: results } = useCachedPromise(
    (driveId: number, query: string) => async (options) => {
      const { data, has_more, cursor } = await infomaniak.drives.search({ driveId, query, cursor: options.cursor });
      return { data, hasMore: has_more, cursor };
    },
    [drive.id, searchText],
    {
      initialData: [],
      execute: !!searchText.trim(),
    },
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle>
      <List.EmptyView icon={{ source: Icon.MagnifyingGlass, tintColor: TINT_COLOR }} title="No results in the kDrive" />
      <List.Section title={`${drive.name} > Search results`} subtitle={`${results.length}`}>
        {results.map((result) => (
          <List.Item
            key={result.id}
            icon={result.type === "dir" ? Icon.Folder : Icon.Document}
            title={result.name}
            accessories={[
              { date: new Date(result.last_modified_at * 1000) },
              { text: "size" in result ? filesize(result.size, { standard: "jedec" }) : "" },
            ]}
            actions={
              <ActionPanel>
                {result.type === "file" && (
                  <>
                    <Action.Push
                      icon={Icon.Clock}
                      title="Activity"
                      target={<Activity driveId={drive.id} fileId={result.id} />}
                    />
                    <Action.Push
                      icon={Icon.SpeechBubbleActive}
                      title="Comments"
                      target={<Comments driveId={drive.id} fileId={result.id} />}
                    />
                  </>
                )}
                <Action.OpenInBrowser
                  url={`https://kdrive.infomaniak.com/app/drive/${drive.id}/redirect/${result.id}`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function Activity({ driveId, fileId }: { driveId: number; fileId: number }) {
  const { isLoading, data: activities } = useCachedPromise(
    (driveId: number, fileId: number) => async (options) => {
      const { data, has_more, cursor } = await infomaniak.drives.files.getActivities({
        driveId,
        fileId,
        cursor: options.cursor,
      });
      return { data, hasMore: has_more, cursor };
    },
    [driveId, fileId],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      <List.Section subtitle={`${activities.length}`}>
        {activities.map((activity) => (
          <List.Item
            key={activity.id}
            icon={Icon.Clock}
            title={`${activity.user_id}`}
            subtitle={`has ${activity.action === "file_create" ? "created" : "consulted"} the file`}
            accessories={[{ date: new Date(activity.created_at * 1000) }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
function Comments({ driveId, fileId }: { driveId: number; fileId: number }) {
  const { isLoading, data: comments } = useCachedPromise(
    (driveId: number, fileId: number) => async (options) => {
      const { data, pages } = await infomaniak.drives.files.getComments({ driveId, fileId, page: options.page + 1 });
      return { data, hasMore: options.page < pages };
    },
    [driveId, fileId],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={{ source: Icon.SpeechBubbleActive, tintColor: TINT_COLOR }}
        title="No comments at this time"
      />
      <List.Section subtitle={`${comments.length}`}>
        {comments.map((comment) => (
          <List.Item
            key={comment.id}
            icon={Icon.SpeechBubbleActive}
            title=""
            detail={<List.Item.Detail markdown={comment.body} />}
          />
        ))}
      </List.Section>
    </List>
  );
}
