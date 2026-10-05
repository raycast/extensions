import { useMemo, useEffect } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";

import { withQuery, CacheActions } from "@/components";
import { JiraIssueTransitionForm } from "@/pages";
import {
  useJiraBoardsQuery,
  useJiraBoardActiveSprintQuery,
  useJiraBoardConfigurationQuery,
  useJiraBoardSprintIssuesQuery,
  useJiraBoardIssuesInfiniteQuery,
  useJiraBoardCachedState,
  useFetchNextPageWithToast,
  useRefetchWithToast,
} from "@/hooks";
import { groupSprintIssuesByColumn } from "@/utils";
import { JIRA_BOARD_TYPE, PAGINATION_SIZE } from "@/constants";
import type { ProcessedJiraKanbanBoardIssue } from "@/types";

export default withQuery(JiraBoardView);

function JiraBoardView() {
  const { boardId, setBoardId, sprintId, setSprintId, boardType, setBoardType } = useJiraBoardCachedState();

  const {
    data: boards,
    isLoading: boardsLoading,
    isSuccess: boardsSuccess,
    refetch: refetchBoards,
  } = useJiraBoardsQuery({
    meta: { errorMessage: "Failed to Load Boards" },
  });

  const { data: boardConfiguration, isLoading: boardConfigurationLoading } = useJiraBoardConfigurationQuery(boardId, {
    enabled: boardId > -1,
    meta: { errorMessage: "Failed to Load Board Configuration" },
  });

  const {
    data: sprint,
    isLoading: sprintLoading,
    isSuccess: sprintSuccess,
  } = useJiraBoardActiveSprintQuery(boardId, {
    enabled: boardId > -1 && boardType === JIRA_BOARD_TYPE.SCRUM,
    meta: { errorMessage: "Failed to Load Sprint" },
  });

  const {
    data: sprintIssues,
    isLoading: sprintIssuesLoading,
    refetch: refetchSprintIssues,
  } = useJiraBoardSprintIssuesQuery(boardId, sprintId, {
    enabled: boardId > -1 && sprintId > -1 && boardType === JIRA_BOARD_TYPE.SCRUM,
    meta: { errorMessage: "Failed to Load Sprint Issues" },
  });

  const {
    data: kanbanIssues,
    isLoading: kanbanIssuesLoading,
    isFetchingNextPage: isFetchingNextKanbanIssues,
    hasNextPage: hasNextKanbanIssues,
    fetchNextPage: fetchNextKanbanIssues,
    refetch: refetchKanbanIssues,
  } = useJiraBoardIssuesInfiniteQuery(boardId, {
    enabled: boardId > -1 && boardType === JIRA_BOARD_TYPE.KANBAN,
    meta: { errorMessage: "Failed to Load Board Issues" },
  });

  const fetchNextPageWithToast = useFetchNextPageWithToast({
    hasNextPage: hasNextKanbanIssues,
    isFetchingNextPage: isFetchingNextKanbanIssues,
    fetchNextPage: fetchNextKanbanIssues,
  });

  const refetchBoardsWithToast = useRefetchWithToast({ refetch: refetchBoards });

  useEffect(() => {
    const hasBoards = boardsSuccess && boards;
    if (!hasBoards) return;

    let nextBoard = boards.find((board) => board.id === boardId);
    if (!nextBoard && boards.length > 0) {
      nextBoard = boards[0];
    }

    const nextBoardId = nextBoard?.id ?? -1;
    if (nextBoardId !== boardId) {
      setBoardId(nextBoardId);
    }

    setBoardType(nextBoard?.type ?? JIRA_BOARD_TYPE.SCRUM);
  }, [boardsSuccess, boards]);

  useEffect(() => {
    if (sprint && sprint.id !== sprintId) {
      setSprintId(sprint.id);
    }
  }, [sprint, sprintId]);

  const groupedIssues = useMemo(() => {
    if (!boardConfiguration?.columnConfig.columns || !sprintIssues) {
      return {};
    }
    return groupSprintIssuesByColumn(sprintIssues, boardConfiguration);
  }, [sprintIssues, boardConfiguration]);

  const isLoading =
    boardsLoading || sprintLoading || boardConfigurationLoading || sprintIssuesLoading || kanbanIssuesLoading;

  const onBoardChange = (value: string) => {
    if (!boardsSuccess) return;

    setBoardId(Number(value));

    const board = boards.find((board) => board.id.toString() === value);
    setBoardType(board?.type ?? JIRA_BOARD_TYPE.SCRUM);
  };

  const fetchIssuesWithToast = async () => {
    try {
      if (boardType === JIRA_BOARD_TYPE.KANBAN) {
        await refetchKanbanIssues();
      } else {
        await refetchSprintIssues();
      }
      showToast(Toast.Style.Success, "Refreshed");
    } catch {
      // Error handling is done by useEffect
    }
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarPlaceholder="Filter by summary, key, assignee, epic, status..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Board" value={boardId.toString()} onChange={onBoardChange} storeValue>
          {boards?.map((board) => (
            <List.Dropdown.Item key={board.id} title={board.name} value={board.id.toString()} />
          ))}
        </List.Dropdown>
      }
      pagination={
        boardType === JIRA_BOARD_TYPE.KANBAN
          ? {
              hasMore: hasNextKanbanIssues,
              onLoadMore: fetchNextPageWithToast,
              pageSize: PAGINATION_SIZE,
            }
          : undefined
      }
    >
      {boardsSuccess && !boards.length ? (
        <NoBoardsEmptyView onRefetch={refetchBoardsWithToast} />
      ) : boardType === JIRA_BOARD_TYPE.KANBAN ? (
        <KanbanList
          issues={kanbanIssues?.list}
          sectionTitle={`Results (${kanbanIssues?.list.length || 0}/${kanbanIssues?.total || 0})`}
          onRefetch={fetchIssuesWithToast}
        />
      ) : sprintSuccess && !sprint ? (
        <NoSprintEmptyView onRefetch={fetchIssuesWithToast} />
      ) : (
        <ScrumList groupedIssues={groupedIssues} onRefetch={fetchIssuesWithToast} />
      )}
    </List>
  );
}

interface KanbanListProps {
  issues?: ProcessedJiraKanbanBoardIssue[];
  sectionTitle: string;
  onRefetch: () => void;
}

function KanbanList({ issues, sectionTitle, onRefetch }: KanbanListProps) {
  if (!issues || issues.length === 0) {
    return <NoIssuesEmptyView onRefetch={onRefetch} />;
  }

  return (
    <List.Section title={sectionTitle}>
      {issues.map((item) => (
        <BoardIssueItem key={item.renderKey} item={item} onRefetch={onRefetch} />
      ))}
    </List.Section>
  );
}

interface ScrumListProps {
  groupedIssues: Record<string, ProcessedJiraKanbanBoardIssue[]>;
  onRefetch: () => void;
}

function ScrumList({ groupedIssues, onRefetch }: ScrumListProps) {
  return (
    <>
      {Object.entries(groupedIssues).map(([columnName, issues]) => (
        <List.Section key={columnName} title={`${columnName} (${issues.length})`}>
          {issues.map((item) => (
            <BoardIssueItem key={item.renderKey} item={item} onRefetch={onRefetch} />
          ))}
        </List.Section>
      ))}
    </>
  );
}

interface BoardIssueItemProps {
  item: ProcessedJiraKanbanBoardIssue;
  onRefetch: () => void;
}

function BoardIssueItem({ item, onRefetch }: BoardIssueItemProps) {
  return (
    <List.Item
      key={item.renderKey}
      title={item.title}
      subtitle={item.subtitle}
      icon={item.icon}
      accessories={item.accessories}
      keywords={item.keywords}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={item.url} />
          {item.editUrl && (
            <Action.OpenInBrowser
              icon={Icon.Pencil}
              title="Edit in Browser"
              url={item.editUrl}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          )}
          <Action.Push
            title="Transition Status"
            target={<JiraIssueTransitionForm issueKey={item.key} onUpdate={onRefetch} />}
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action.CopyToClipboard title="Copy URL" shortcut={{ modifiers: ["cmd"], key: "c" }} content={item.url} />
          <Action.CopyToClipboard
            title="Copy Key"
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            content={item.key}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefetch}
          />
          <CacheActions />
        </ActionPanel>
      }
    />
  );
}

interface NoSprintEmptyViewProps {
  onRefetch: () => void;
}

function NoSprintEmptyView({ onRefetch }: NoSprintEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="This board doesn't have an active sprint"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefetch} />
          <CacheActions />
        </ActionPanel>
      }
    />
  );
}

interface NoIssuesEmptyViewProps {
  onRefetch: () => void;
}

function NoIssuesEmptyView({ onRefetch }: NoIssuesEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="No issues found in this board"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefetch} />
          <CacheActions />
        </ActionPanel>
      }
    />
  );
}

interface NoBoardsEmptyViewProps {
  onRefetch: () => void;
}

function NoBoardsEmptyView({ onRefetch }: NoBoardsEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.List}
      title="No Boards"
      description="No boards available in this Jira instance"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefetch} />
          <CacheActions />
        </ActionPanel>
      }
    />
  );
}
