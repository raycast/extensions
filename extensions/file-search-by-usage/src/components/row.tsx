import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import path from "node:path";
import { Entry, Visit } from "../lib/types";
import { ScoreParts } from "../lib/score";
import { formatSize, relativeTime } from "../lib/format";
import {
  ColumnWidths,
  pad,
  scoreCell,
  visitsCell,
} from "../lib/accessory-columns";
import { displayPath } from "../lib/read-dir";
import { NavigationActions } from "./navigation-actions";
import { SearchHistoryActions } from "./search-history-actions";
import { HiddenFilesAction } from "./hidden-files-action";

export type RowHandlers = {
  /** Opens a file in its default app or a folder in Finder. */
  onOpen: (entry: Entry) => void;
  /** ⇧⌘↓ navigates into a folder. */
  onDescend: (entry: Entry) => void;
  /** Navigates to the parent; undefined at the filesystem root or global scope. */
  onUp?: () => void;
  onReturnToStart?: () => void;
  /** Cycles query history with ⌘[ and ⌘]. */
  onHistoryBack: () => void;
  onHistoryForward: () => void;
  onTogglePin: (entry: Entry) => void;
  /** Teach the current search text as a shortcut to this item. */
  onLearn?: (entry: Entry) => void;
  /** Rebuilds the fd + SQLite name index. Minutes on a large scope. */
  onRebuildIndex: () => void;
  onToggleDetail: () => void;
  onToggleHidden: () => void;
  onRefresh: () => void;
  onResetRanking: (entry: Entry) => void;
  onClearAllRankings: () => void;
  /** Everything in Raycast's storage for this extension. Files are untouched. */
  onEraseEverything: () => void;
};

type Props = {
  /** Raycast selection handle, stable by path within one result generation. */
  id: string;
  entry: Entry;
  visit?: Visit;
  score: ScoreParts;
  showScore: boolean;
  /** Column widths shared by every row, so the accessories line up. */
  columns: ColumnWidths;
  /**
   * True when Spotlight usage metadata was read for this entry.
   *
   * It is read for the children of the folder being browsed and for nothing
   * else, so an indexed search result has none. Without this the detail panel
   * said "no metadata", which reads as "Spotlight had nothing" when the truth
   * is that it was never asked.
   */
  usageRead: boolean;
  showingDetail: boolean;
  /** Where it lives. Shown for anything that is not a direct child of the scope. */
  subtitle?: string;
  pinned: boolean;
  handlers: RowHandlers;
};

/** Builds native metadata rows for the detail panel. */
function detailPairs(
  entry: Entry,
  visit: Visit | undefined,
  score: ScoreParts,
  usageRead: boolean,
): { section: string; rows: [string, string][] }[] {
  return [
    {
      section: "",
      rows: [
        ["Path", displayPath(entry.path)],
        [
          "Kind",
          entry.isDirectory
            ? "Folder"
            : path.extname(entry.name).replace(".", "").toUpperCase() || "File",
        ],
        ["Size", entry.isDirectory ? "—" : formatSize(entry.size)],
        ["Modified", relativeTime(entry.mtimeMs)],
        ["Created", relativeTime(entry.birthtimeMs)],
        [
          "Opened here",
          visit
            ? `${visit.count}× · last ${relativeTime(visit.lastVisit)}`
            : "never",
        ],
        [
          "Spotlight use",
          entry.useCount !== undefined
            ? `${entry.useCount}× · last ${relativeTime(entry.lastUsedMs ?? 0)}`
            : usageRead
              ? "none recorded"
              : "not read for indexed results",
        ],
      ],
    },
    {
      section: "Ranking",
      rows: [
        ["Total score", score.total.toFixed(1)],
        ["… from your opens", score.visit.toFixed(1)],
        ["… from modified date", score.mtime.toFixed(1)],
        ["… from Spotlight", score.spotlight.toFixed(1)],
        ["… depth penalty", score.depth.toFixed(1)],
        ["… from name match", score.match.toFixed(1)],
      ],
    },
  ];
}

/** Renders one file or folder result. */
export function Row({
  id,
  entry,
  visit,
  score,
  showScore,
  columns,
  usageRead,
  showingDetail,
  subtitle,
  pinned,
  handlers,
}: Props) {
  /*
   * Opens, then score, then modified date, in fixed-width columns.
   *
   * Every row carries every cell, even an empty one, and every cell is padded
   * to its column's width. Raycast sizes accessories to their content and lays
   * them out from the right, so a cell that is missing or merely shorter moves
   * everything to its left. The pin slot holds a transparent image when the
   * item is not pinned, for the same reason: it is the same box as the icon it
   * stands in for.
   */
  const opens = visitsCell(visit?.count);
  const total = scoreCell(showScore ? score.total : undefined);
  const accessories: List.Item.Accessory[] = [
    {
      icon: pinned ? Icon.Pin : "blank.png",
      tooltip: pinned ? "Pinned" : undefined,
    },
    {
      text: pad(opens, columns.visits),
      tooltip: opens === "" ? "Never opened" : `Opened ${visit?.count}×`,
    },
  ];
  if (showScore)
    accessories.push({
      tag: pad(total, columns.score),
      tooltip: "Usage score",
    });
  accessories.push({
    text: pad(relativeTime(entry.mtimeMs), columns.time),
    tooltip: "Last modified",
  });

  return (
    <List.Item
      id={id}
      title={entry.name}
      subtitle={showingDetail ? undefined : subtitle}
      icon={{ fileIcon: entry.path }}
      accessories={showingDetail ? undefined : accessories}
      // Also enables dragging the item into another app.
      quickLook={{ path: entry.path, name: entry.name }}
      detail={
        showingDetail ? (
          <RowDetail
            entry={entry}
            visit={visit}
            score={score}
            usageRead={usageRead}
          />
        ) : undefined
      }
      actions={
        <RowActions
          entry={entry}
          pinned={pinned}
          showingDetail={showingDetail}
          handlers={handlers}
        />
      }
    />
  );
}

// Raycast mounts these panels only for the selected item. Keep their trees lazy.
function RowDetail({
  entry,
  visit,
  score,
  usageRead,
}: Pick<Props, "entry" | "visit" | "score" | "usageRead">) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {detailPairs(entry, visit, score, usageRead).flatMap(
            ({ section, rows }) => [
              ...(section
                ? [
                    <List.Item.Detail.Metadata.Separator
                      key={`sep-${section}`}
                    />,
                  ]
                : []),
              ...rows.map(([title, text]) => (
                <List.Item.Detail.Metadata.Label
                  key={`${section}-${title}`}
                  title={title}
                  text={text}
                />
              )),
            ],
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function RowActions({
  entry,
  pinned,
  showingDetail,
  handlers,
}: Pick<Props, "entry" | "pinned" | "showingDetail" | "handlers">) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={entry.isDirectory ? "Open in Finder" : "Open"}
          icon={entry.isDirectory ? Icon.Finder : Icon.ArrowRight}
          onAction={() => handlers.onOpen(entry)}
        />
        {/* Raycast assigns Command-Return to the second action. */}
        <Action.ShowInFinder
          path={entry.path}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
        />
        <Action.ToggleQuickLook
          title="Quick Look"
          shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        />
        <Action.OpenWith
          path={entry.path}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Navigation">
        {entry.isDirectory && (
          <Action
            title="Navigate into Folder"
            icon={Icon.ChevronRight}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => handlers.onDescend(entry)}
          />
        )}
        <NavigationActions
          onUp={handlers.onUp}
          onReturnToStart={handlers.onReturnToStart}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Search">
        <HiddenFilesAction onToggle={handlers.onToggleHidden} />
        <SearchHistoryActions
          onHistoryBack={handlers.onHistoryBack}
          onHistoryForward={handlers.onHistoryForward}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="This Item">
        <Action
          title={pinned ? "Unpin" : "Pin"}
          icon={pinned ? Icon.PinDisabled : Icon.Pin}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() => handlers.onTogglePin(entry)}
        />
        <Action
          title={showingDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={handlers.onToggleDetail}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Path"
          content={entry.path}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        <Action.CopyToClipboard
          title="Copy Name"
          content={entry.name}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard
          title="Copy File"
          shortcut={Keyboard.Shortcut.Common.Copy}
          content={{ file: entry.path }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Search Index">
        <Action
          title="Rebuild Search Index"
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          icon={Icon.Download}
          onAction={handlers.onRebuildIndex}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Usage History">
        {handlers.onLearn && (
          <Action
            title="Remember This Search for This Item"
            icon={Icon.Stars}
            shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
            onAction={() => handlers.onLearn?.(entry)}
          />
        )}
        <Action
          title="Reset Ranking for This Item"
          icon={Icon.XMarkCircle}
          shortcut={{ modifiers: ["cmd", "opt"], key: "r" }}
          onAction={() => handlers.onResetRanking(entry)}
        />
        <Action
          title="Clear All Rankings…"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handlers.onClearAllRankings}
        />
        <Action
          title="Delete All Data and Cache…"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handlers.onEraseEverything}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={handlers.onRefresh}
        />
        <Action.Trash
          paths={[entry.path]}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onTrash={() => handlers.onRefresh()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
