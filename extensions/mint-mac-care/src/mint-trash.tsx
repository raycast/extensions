import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatCompact, openMint, plural, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { NeedsNewerMint, RetryActions, chosenAccessory, runConfirmedInMint, useChosen } from "./confirm-in-mint";
import { usePlanWall } from "./plan-wall";
import { NATIVE_APPROVAL_CAPABILITY, hasCapability, runParity, trashReceipt, trashRows } from "./mint-parity";
import type { TrashItem, TrashRemoval, TrashScan } from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";
import { keptSizes } from "./mint-plan";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  if (!hasCapability(resolution.version, NATIVE_APPROVAL_CAPABILITY)) return <NeedsNewerMint command="Empty Trash" />;
  return <EmptyTrash cli={resolution.path} />;
}

/**
 * What is in the Trash, largest first. ↵ ticks a row; ⌘↵ deletes the ticked
 * ones and ⌘⇧↵ the whole Trash, each after the person confirms in Mint's own
 * window. Deleting from the Trash cannot be undone.
 */
function EmptyTrash({ cli }: { cli: string }) {
  const wall = usePlanWall(cli);
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runParity<TrashScan>(path, { action: "disk.trash.scan" }, 5 * 60_000),
    [cli],
  );
  const { chosen, toggle, clear } = useChosen();
  const rows = trashRows(data);
  const total = rows.reduce((sum, row) => sum + row.bytes, 0);
  const picked = rows.filter((row) => chosen.has(row.id));

  async function remove(items: TrashItem[]) {
    if (!data || items.length === 0) return;
    await runConfirmedInMint<TrashRemoval>(
      cli,
      {
        action: "disk.trash.remove",
        sessionID: data.sessionID,
        itemIDs: items.map((item) => item.id),
        permanent: true,
      },
      {
        done: trashReceipt,
        failed: "Mint could not empty the Trash",
        kept: (result) =>
          keptSizes(
            result.failures,
            items,
            (item) => [item.path, item.name],
            (item) => item.bytes,
          ),
      },
      wall,
    );
    clear();
    // Mint's answer is single-use: look again whatever the window answered.
    revalidate();
  }

  const searchBarPlaceholder = data
    ? rows.length
      ? `${formatCompact(total)} in the Trash · ${plural(rows.length, "item")}${data.complete ? "" : " · part of it could not be read"}`
      : "The Trash is empty"
    : "Looking in the Trash…";

  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not read the Trash"
          description={error.message}
          actions={<RetryActions onRetry={revalidate} />}
        />
      ) : null}
      {!error && !isLoading && rows.length === 0 ? (
        <List.EmptyView icon={Icon.CheckCircle} title="The Trash is empty" />
      ) : null}
      {rows.map((item) => {
        const isChosen = chosen.has(item.id);
        const notes = [
          item.inICloud ? "iCloud: deleting it also deletes it on other devices" : undefined,
          item.needsAdministrator ? "macOS asks for an administrator password" : undefined,
        ].filter(Boolean);
        return (
          <List.Item
            key={item.id}
            icon={{ fileIcon: item.path }}
            title={item.name}
            subtitle={notes.join(" · ") || shortPath(item.path)}
            accessories={[{ text: formatCompact(item.bytes) }, chosenAccessory(isChosen)]}
            actions={
              <ActionPanel>
                <Action
                  title={isChosen ? "Unchoose" : "Choose"}
                  icon={isChosen ? Icon.Circle : Icon.CheckCircle}
                  onAction={() => toggle(item.id)}
                />
                {/* Second (⌘↵) reads only; what deletes has its own key (Raycast's rule for the secondary slot). */}
                <Action.ShowInFinder path={item.path} />
                {picked.length ? (
                  <Action
                    title={`Delete ${plural(picked.length, "Chosen Item")}…`}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => remove(picked)}
                  />
                ) : null}
                <Action
                  title="Empty the Whole Trash…"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={() => remove(rows)}
                />
                <ActionPanel.Section>
                  <Action
                    title="Look Again"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                  <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
