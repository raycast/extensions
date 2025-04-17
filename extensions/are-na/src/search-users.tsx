import { useRef } from "react";
import { List, LaunchProps, ActionPanel, Action } from "@raycast/api";
import { useArena } from "./hooks/useArena";
import type { SearchUsersResponse, User } from "./api/types";
import { usePromise } from "@raycast/utils";

interface SearchArguments {
  query: string;
}

function Actions({ user }: { user: User }) {
  return (
    <ActionPanel title={user.full_name ?? ""}>
      <ActionPanel.Section>
        {user.slug && <Action.OpenInBrowser url={`https://www.are.na/${user.slug}`} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {user.slug && (
          <Action.CopyToClipboard
            title="Copy Link"
            content={`https://www.are.na/${user.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function BlockListItem({ user }: { user: User }) {
  return (
    <List.Item icon={{ source: "extension-icon.svg" }} title={user.full_name ?? ""} actions={<Actions user={user} />} />
  );
}

export default function Command(props: LaunchProps<{ arguments: SearchArguments }>) {
  const abortable = useRef<AbortController>(new AbortController());
  const arena = useArena();
  const { query } = props.arguments;
  const { data, isLoading } = usePromise(
    async (q: string): Promise<SearchUsersResponse> => {
      const response = await arena.search(q).users({ per: 100 });
      return response;
    },
    [query],
    {
      abortable,
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search users...">
      {data?.users.length === 0 ? (
        <List.EmptyView title="No users found" description="Try a different search term" />
      ) : (
        data?.users.map((block, index) => <BlockListItem user={block} key={index} />)
      )}
    </List>
  );
}
