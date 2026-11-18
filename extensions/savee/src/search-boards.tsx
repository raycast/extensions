import { Action, ActionPanel, Grid, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listBoards } from "./api";
import { BoardSaves } from "./components/BoardSaves";
import { showSaveeError } from "./errors";
import { FlatBoard, flattenBoards, formatSaveCount } from "./save-utils";

function BoardItem({ board, onRefresh }: { board: FlatBoard; onRefresh: () => void }) {
  return (
    <Grid.Item
      content={board.og_image ? { source: board.og_image, fallback: Icon.AppWindowGrid3x3 } : Icon.AppWindowGrid3x3}
      title={board.title}
      subtitle={formatSaveCount(board.saves_count)}
      keywords={board.parent ? [board.parent.name, board.name] : [board.slug]}
      accessory={board.is_private ? { icon: Icon.Lock, tooltip: "Private" } : undefined}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="Show Saves" icon={Icon.AppWindowGrid3x3} target={<BoardSaves board={board} />} />
            <Action.OpenInBrowser title="Open in Savee" url={board.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Board Link"
              content={board.url}
              shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
            />
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onRefresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => flattenBoards(await listBoards()), [], {
    onError: showSaveeError,
  });

  const boards = data ?? [];
  const yours = boards.filter((board) => board.ownership_type === "user");
  const team = boards.filter((board) => board.ownership_type === "team");

  return (
    <Grid columns={4} aspectRatio="3/2" fit={Grid.Fit.Fill} isLoading={isLoading} searchBarPlaceholder="Search boards">
      {!isLoading && boards.length === 0 ? (
        <Grid.EmptyView icon={Icon.AppWindowGrid3x3} title="No boards yet" description="Create one on savee.com" />
      ) : null}
      <Grid.Section title="Your Boards">
        {yours.map((board) => (
          <BoardItem key={board.id} board={board} onRefresh={revalidate} />
        ))}
      </Grid.Section>
      <Grid.Section title="Team Boards">
        {team.map((board) => (
          <BoardItem key={board.id} board={board} onRefresh={revalidate} />
        ))}
      </Grid.Section>
    </Grid>
  );
}
