import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { NameListItem } from "./name-list-item";
import { type FavoriteList, type SessionNamesResponse } from "./lib/api";

/** Names both participants liked in a session. */
export function SessionMatches({
  sessionId,
  baseUrl,
  apiKey,
  lists,
}: {
  sessionId: string;
  baseUrl: string;
  apiKey: string;
  lists: FavoriteList[];
}) {
  const { data, isLoading } = useFetch<SessionNamesResponse>(`${baseUrl}/api/sessions/${sessionId}/matches`, {
    headers: { "x-api-key": apiKey },
  });
  const names = data?.names ?? [];

  return (
    <List isLoading={isLoading} navigationTitle="Matches" searchBarPlaceholder="Filter matches…">
      {!isLoading && names.length === 0 ? (
        <List.EmptyView
          icon="🎉"
          title="No matches yet"
          description="When you and your partner both like a name, it shows up here."
        />
      ) : (
        names.map((name) => <NameListItem key={name.id} name={name} baseUrl={baseUrl} apiKey={apiKey} lists={lists} />)
      )}
    </List>
  );
}
