import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getClient } from "./lib/preferences";
import { DocumentListItem } from "./components/document-list-item";
import type { DocumentsResponse } from "./lib/types";

const PAGE_SIZE = 50;

export default function Command() {
  // Cursor-paginated: each page returns the opaque next_cursor, which
  // @raycast/utils threads back into the following page's call.
  const { isLoading, data, pagination, error } = usePromise(
    () =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const res = await getClient().request<DocumentsResponse>("GET", "/documents", {
          query: { cursor, limit: PAGE_SIZE },
        });
        return { data: res.documents, hasMore: res.has_more, cursor: res.next_cursor ?? undefined };
      },
    [],
  );

  const documents = data ?? [];

  return (
    <List isLoading={isLoading} pagination={pagination} searchBarPlaceholder="Filter loaded documents…">
      {error ? (
        // Distinguish a failed load (bad token, network) from a genuinely empty
        // vault — otherwise a revoked token reads as "you have no documents".
        <List.EmptyView icon={Icon.Warning} title="Couldn't load documents" description={error.message} />
      ) : documents.length === 0 ? (
        // Loading-aware so the first page load doesn't flash Raycast's generic
        // "No Results" before any documents arrive.
        <List.EmptyView
          icon={isLoading ? undefined : Icon.Document}
          title={isLoading ? "Loading documents…" : "No documents yet"}
          description={isLoading ? undefined : "Add documents in Granite, then browse them here."}
        />
      ) : (
        documents.map((doc) => <DocumentListItem key={doc.id} doc={doc} />)
      )}
    </List>
  );
}
