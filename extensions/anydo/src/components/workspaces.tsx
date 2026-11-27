import { Action, ActionPanel, Icon, List, open } from "@raycast/api";

import { makeClient } from "../anydo/auth";
import { t } from "../anydo/i18n";
import type { AnyDoBoard, AnyDoSection, AnyDoSpace } from "../anydo/types";
import { useAsync } from "./use-async";

interface BoardWithSections {
  space: AnyDoSpace;
  board: AnyDoBoard;
  sections: AnyDoSection[];
}

function nameOf(
  entity: { name?: string; title?: string } | undefined,
  fallback: string,
): string {
  return entity?.name ?? entity?.title ?? fallback;
}

function idOf(
  entity:
    | { id?: string; board_id?: string; space_id?: string; section_id?: string }
    | undefined,
): string {
  return (
    entity?.id ??
    entity?.board_id ??
    entity?.space_id ??
    entity?.section_id ??
    ""
  );
}

/** Workspaces, boards and their sections — read-only overview (needs a workspace in Any.do). */
export function WorkspacesView() {
  const { data, isLoading } = useAsync(async () => {
    const client = makeClient();
    const spaces = await client.getActiveSpaces();
    const boards: BoardWithSections[] = [];
    for (const space of spaces) {
      const spaceBoards = await client.getWorkspaceBoards(
        idOf(space) || undefined,
      );
      for (const board of spaceBoards) {
        const sections = idOf(board)
          ? await client.getBoardSections(idOf(board))
          : [];
        boards.push({ space, board, sections });
      }
    }
    return { spaces, boards };
  });

  const spaces = data?.spaces ?? [];
  const boards = data?.boards ?? [];

  if (!isLoading && spaces.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.TwoPeople}
          title={t("ورک‌اسپیس فعالی نداری", "No active workspace")}
          description={t(
            "تیم‌ها و بردهای Any.do اینجا نمایش داده می‌شوند. برای فعال شدن، یک ورک‌اسپیس در Any.do بساز و اعضا را اضافه کن.",
            "Team spaces and boards show up here. Create a workspace in Any.do to use them.",
          )}
          actions={
            <ActionPanel>
              <Action
                title={t(
                  "ساخت ورک‌اسپیس در Any.do",
                  "Create a workspace in Any.do",
                )}
                icon={Icon.Globe}
                onAction={() => open("https://app.any.do/")}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={t("تیم و بردها", "Teams & boards")}
    >
      {spaces.map((space) => (
        <List.Section
          key={idOf(space)}
          title={nameOf(space, t("ورک‌اسپیس", "Workspace"))}
        >
          {boards
            .filter((entry) => idOf(entry.space) === idOf(space))
            .map((entry) => (
              <List.Item
                key={idOf(entry.board)}
                icon={Icon.BarChart}
                title={nameOf(entry.board, t("برد", "Board"))}
                subtitle={entry.sections
                  .map((section) => nameOf(section, "—"))
                  .join(" · ")}
                accessories={[
                  {
                    tag: {
                      value: `${entry.sections.length} ${t("ستون", "sections")}`,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title={t("باز کردن Any.do", "Open Any.do")}
                      icon={Icon.Globe}
                      onAction={() => open("https://app.any.do/")}
                    />
                    <Action.CopyToClipboard
                      title={t("کپی شناسه برد", "Copy board id")}
                      content={idOf(entry.board)}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
