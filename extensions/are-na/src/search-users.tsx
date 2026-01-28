import { useRef } from "react";
import { List, LaunchProps, ActionPanel, Action } from "@raycast/api";
import { useArena } from "./hooks/useArena";
import type { SearchUsersResponse, User } from "./api/types";
import { usePromise, showFailureToast } from "@raycast/utils";

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

function UserListItem({ user }: { user: User }) {
  return (
    <List.Item icon={{ source: "extension-icon.png" }} title={user.full_name ?? ""} actions={<Actions user={user} />} />
  );
}

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchUsers }>) {
  const abortable = useRef<AbortController>(new AbortController());
  const arena = useArena();
  const { query } = props.arguments;
  const { data, isLoading } = usePromise(
    async (q: string): Promise<SearchUsersResponse> => {
      try {
        const response = await arena.search(q).users({ per: 100 });
        return response;
      } catch (error) {
        showFailureToast({
          title: "Error",
          message: "Failed to fetch users",
          error,
        });
        throw error;
      }
    },
    [query],
    {
      abortable,
    },
  );

  return (
    <List isLoading={isLoading}>{data?.users.map((user, index) => <UserListItem user={user} key={index} />)}</List>
  );
}
