import {
  Action,
  ActionPanel,
  Cache,
  closeMainWindow,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  List,
  open,
  showHUD,
} from "@raycast/api";
import { runAppleScript, useFrecencySorting } from "@raycast/utils";
import { useMemo } from "react";
import { failureFromError, JUMP_SCRIPT, parseJumpOutput, reasonFor } from "./jump";
import { ExtensionKind, ExtensionRow, loadRows, rowKey } from "./sources";

const cache = new Cache();

const KIND_TAG: Record<ExtensionKind, { value: string; color: Color }> = {
  "built-in": { value: "Built-in", color: Color.Red },
  store: { value: "Store", color: Color.Blue },
  dev: { value: "Dev", color: Color.Green },
};

const ACCESSIBILITY_PANE = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

async function openSettings(row: ExtensionRow) {
  await closeMainWindow();
  let result;
  try {
    result = parseJumpOutput(
      await runAppleScript(JUMP_SCRIPT, [row.title], { language: "JavaScript", timeout: 20000 }),
    );
  } catch (error) {
    result = failureFromError(error instanceof Error ? error.message : String(error));
  }
  if (result.ok) return;
  // Missing permission is the one failure the user can fix right away, so take them there.
  if (result.code === "no-accessibility") await open(ACCESSIBILITY_PANE);
  await showHUD(`Couldn't open ${row.title} settings: ${reasonFor(row.title, result)}`);
}

export default function Command() {
  const { showDevelopment, showAuthor, showOrigin } = getPreferenceValues<Preferences>();
  const rows = useMemo(() => loadRows(showDevelopment, cache, environment.raycastVersion), [showDevelopment]);
  // Most-used extensions rise to the top; never-opened ones keep A–Z order.
  const {
    data: sorted,
    visitItem,
    resetRanking,
  } = useFrecencySorting(rows, {
    key: rowKey,
    sortUnvisited: (a, b) => a.title.localeCompare(b.title),
  });
  return (
    <List searchBarPlaceholder="Search extensions…">
      {sorted.map((row) => (
        <List.Item
          key={rowKey(row)}
          title={row.title}
          subtitle={showAuthor ? row.author : undefined}
          icon={row.icon ? { source: row.icon } : Icon.Box}
          accessories={showOrigin ? [{ tag: KIND_TAG[row.kind] }] : []}
          actions={
            <ActionPanel>
              <Action
                title="Configure Extension"
                icon={Icon.Gear}
                onAction={async () => {
                  await visitItem(row);
                  await openSettings(row);
                }}
              />
              {row.kind === "store" && row.owner && row.name && (
                <Action
                  title="Open Store Page"
                  icon={Icon.Store}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                  onAction={() => open(`raycast://extensions/${row.owner}/${row.name}`)}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Extension Name"
                content={row.title}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action title="Reset Ranking" icon={Icon.ArrowCounterClockwise} onAction={() => resetRanking(row)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
