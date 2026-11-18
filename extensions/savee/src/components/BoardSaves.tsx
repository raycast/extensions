import { Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listBoardSaves, MAX_PAGE_SIZE } from "../api";
import { showSaveeError } from "../errors";
import { formatSaveCount, FlatBoard } from "../save-utils";
import { SaveGrid } from "./SaveGrid";

export function BoardSaves({ board }: { board: FlatBoard }) {
  const { data, isLoading, pagination, revalidate } = useCachedPromise(
    (boardId: string) => async (options: { cursor?: string }) => {
      const page = await listBoardSaves(boardId, options.cursor);
      return { data: page.data, hasMore: page.has_more, cursor: page.next_cursor ?? undefined };
    },
    [board.id],
    { onError: showSaveeError },
  );

  return (
    <SaveGrid
      saves={data ?? []}
      isLoading={isLoading}
      navigationTitle={board.title}
      searchBarPlaceholder={"Filter " + board.name}
      pagination={pagination ? { ...pagination, pageSize: MAX_PAGE_SIZE } : undefined}
      onRefresh={revalidate}
      sectionTitle={board.title}
      sectionSubtitle={formatSaveCount(board.saves_count)}
      emptyView={<Grid.EmptyView icon={Icon.AppWindowGrid3x3} title="Nothing on this board yet" />}
    />
  );
}
