import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import path from "node:path";
import { Entry, Visit } from "../lib/types";
import { ScoreParts } from "../lib/score";
import { formatSize, relativeTime } from "../lib/format";
import { displayPath } from "../lib/read-dir";

export type RowHandlers = {
  /** Opens a file in its default app or a folder in Finder. */
  onOpen: (entry: Entry) => void;
  /** ⌘→ — navigate into a folder. */
  onDescend: (entry: Entry) => void;
  /** Navigates to the parent; undefined at the filesystem root or global scope. */
  onUp?: () => void;
  /** Cycles query history with ⌘[ and ⌘]. */
  onHistoryBack: () => void;
  onHistoryForward: () => void;
  onTogglePin: (entry: Entry) => void;
  /** Teach the current search text as a shortcut to this item. */
  onLearn?: (entry: Entry) => void;
  /** Reindexes Google Drive shortcuts and shared-folder contents. */
  onReindexShortcuts: () => void;
  onToggleDetail: () => void;
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
            : "no metadata",
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
  showingDetail,
  subtitle,
  pinned,
  handlers,
}: Props) {
  const accessories: List.Item.Accessory[] = [];
  if (pinned) accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
  if (showScore)
    accessories.push({
      tag: score.total.toFixed(0),
      tooltip: "Usage score",
    });
  if (visit)
    accessories.push({
      text: `${visit.count}×`,
      tooltip: `Opened ${visit.count}×`,
    });
  accessories.push({
    text: relativeTime(entry.mtimeMs),
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
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                {detailPairs(entry, visit, score).flatMap(
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
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title={entry.isDirectory ? "Open in Finder" : "Open"}
              icon={entry.isDirectory ? Icon.Finder : Icon.ArrowRight}
              onAction={() => handlers.onOpen(entry)}
            />
            {entry.isDirectory && (
              <Action
                title="Navigate into Folder"
                icon={Icon.ChevronRight}
                shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                onAction={() => handlers.onDescend(entry)}
              />
            )}
            {handlers.onUp && (
              <Action
                title="Go to Parent Folder"
                icon={Icon.ChevronLeft}
                shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                onAction={handlers.onUp}
              />
            )}
            <Action.ToggleQuickLook
              title="Quick Look"
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Search">
            <Action
              title="Previous Search"
              icon={Icon.ArrowLeftCircle}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={handlers.onHistoryBack}
            />
            <Action
              title="Next Search"
              icon={Icon.ArrowRightCircle}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              onAction={handlers.onHistoryForward}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="This Item">
            <Action.ShowInFinder
              path={entry.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            />
            <Action.OpenWith
              path={entry.path}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
            />
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
            <Action.CopyToClipboard title="Copy Name" content={entry.name} />
            <Action.CopyToClipboard
              title="Copy File"
              content={{ file: entry.path }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Google Drive">
            <Action
              title="Index Google Drive"
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              icon={Icon.Repeat}
              onAction={handlers.onReindexShortcuts}
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
              onTrash={() => handlers.onRefresh()}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
