import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { categoryTitle, t } from "../i18n.ts";
import {
  DEFAULT_LOCATION,
  TRASH_LOCATION,
  validateBookmark,
} from "../model.ts";
import type {
  Bookmark,
  Candidate,
  Conflict,
  LibraryState,
  Mutation,
} from "../model.ts";
import { isCatalog, locationLabel } from "./value-labels.ts";

export type ConflictChoice = { eventId: string; mutation: Mutation };

export function ConflictView({
  state,
  conflict,
  onChoose,
}: {
  state: LibraryState;
  conflict: Conflict;
  onChoose: (choice: ConflictChoice) => void;
}) {
  const { pop } = useNavigation();
  const heads = [...(state.heads[conflict.entityKey] ?? [])].sort();

  function choose(candidate: Candidate, mode: "keep" | "trash" | "default") {
    if (isCatalog(candidate.value)) {
      onChoose({
        eventId: candidate.eventId,
        mutation: {
          entity: "catalog",
          entityId: candidate.value.id,
          baseHeads: heads,
          value: candidate.value,
        },
      });
      pop();
      return;
    }
    const bookmark = candidate.value;
    const value =
      mode === "keep"
        ? bookmark
        : validateBookmark({
            ...bookmark,
            isDeleted: mode === "trash",
            prevLocations:
              mode === "trash" ? bookmark.locations : bookmark.prevLocations,
            locations: mode === "trash" ? [TRASH_LOCATION] : [DEFAULT_LOCATION],
            updatedAt: Date.now(),
          });
    onChoose({
      eventId: candidate.eventId,
      mutation: {
        entity: "bookmark",
        entityId: bookmark.id,
        baseHeads: heads,
        value,
        coveredVisits: candidate.coveredVisits,
        ...(mode === "keep" && candidate.removed ? { removed: true } : {}),
      },
    });
    pop();
  }

  return (
    <List navigationTitle={t("选择要保留的版本")}>
      <List.Section
        title={t`${conflict.candidates.length} 个并发版本`}
        subtitle={t("选择后返回上一页；全部冲突选择完才能应用")}
      >
        {conflict.candidates.map((candidate) => {
          const value = candidate.value;
          const catalog = isCatalog(value);
          const bookmark = catalog ? undefined : (value as Bookmark);
          return (
            <List.Item
              key={candidate.eventId}
              title={
                catalog
                  ? t`分类表：${value.groups.length} 个一级分类`
                  : bookmark!.title || t`书签 ${bookmark!.id}`
              }
              subtitle={
                catalog
                  ? value.groups
                      .map((g) => categoryTitle(g.id, g.name))
                      .join(t("、"))
                  : [
                      bookmark!.url,
                      bookmark!.desc ?? "",
                      t`位置：${bookmark!.locations.map((l) => locationLabel(state.catalog, l)).join(t("，"))}`,
                    ]
                      .filter(Boolean)
                      .join("\n")
              }
              icon={
                candidate.removed || bookmark?.isDeleted
                  ? Icon.Trash
                  : catalog
                    ? Icon.Folder
                    : Icon.Bookmark
              }
              accessories={[
                { tag: t`版本 ${candidate.eventId.slice(0, 8)}` },
                ...(candidate.removed ? [{ tag: t("永久移除") }] : []),
                ...(bookmark?.isDeleted ? [{ tag: t("墓碑（已删除）") }] : []),
                ...(bookmark?.visits !== undefined
                  ? [{ text: t`基数 ${bookmark.visits} 次` }]
                  : []),
                ...(bookmark
                  ? [{ date: new Date(bookmark.updatedAt ?? 0) }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={
                      candidate.removed
                        ? t("保留永久移除状态")
                        : t("选择并保留此版本")
                    }
                    icon={Icon.Checkmark}
                    onAction={() => choose(candidate, "keep")}
                  />
                  {bookmark && (
                    <>
                      <Action
                        title={t("选择并移入回收站")}
                        icon={Icon.Trash}
                        onAction={() => choose(candidate, "trash")}
                      />
                      <Action
                        title={t("选择并修复到默认位置")}
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => choose(candidate, "default")}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
