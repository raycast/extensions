import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  environment,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { useState } from "react";
import { getCommitDiff, getItemDiff, getItemHistory, revertItem, type GitCommit } from "./lib/git";
import { detachItem, pullCopyItem, pullItem, pushItem, refreshItem, unlinkItem, type VaultItem } from "./lib/items";
import { relationshipVisual, sideBySideDiffs, type DiffVisuals } from "./lib/inspector-visuals";
import SelectiveSync from "./selective-sync";

function relativeItemPath(item: VaultItem): string {
  return relative(join(item.defaultVault, ".obsidian"), item.defaultPath);
}

function plain(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replace(/[*_#|]/g, "\\$&")
    .replaceAll("\n", " ");
}

function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function friendlySubject(subject: string): string {
  if (/^\(auto commit\) vault backup:/i.test(subject)) return "Automatic vault backup";
  return subject.length > 72 ? subject.slice(0, 69) + "…" : subject;
}

type StateInfo = { label: string; meaning: string; next: string; source: string; target: string };

function stateInfo(item: VaultItem): StateInfo {
  switch (item.state) {
    case "available":
      return {
        label: "Available to link",
        meaning: "The Default Vault has this item. This vault does not have it yet.",
        next: "Choose **Link from Default Vault** to make it available here.",
        source: "Present",
        target: "Missing",
      };
    case "linked":
      return {
        label: "Linked to Default Vault",
        meaning: "This vault uses the Default Vault's item directly. Updates to the source appear here automatically.",
        next: "This link is working. Choose **Detach and Keep Local Copy** if this vault needs independent edits.",
        source: "Present",
        target: "Linked",
      };
    case "native-branched":
      return {
        label: "Different copies",
        meaning: "Both vaults have their own copy, and the contents differ.",
        next: "Review the comparison below, then choose which vault's copy to keep from the action menu.",
        source: "Own copy",
        target: "Own copy · different",
      };
    case "native-identical":
      return {
        label: "Matching independent copies",
        meaning: "Both vaults have the same content right now, but each has its own copy. Future edits will not sync.",
        next: "Choose **Link from Default Vault** if you want future updates to stay in sync.",
        source: "Own copy",
        target: "Own copy · matching",
      };
    case "native-unique":
      return {
        label: "Only in this vault",
        meaning: "This item exists in the selected vault and is absent from the Default Vault.",
        next: "Choose **Move to Default Vault and Link** if you want to share it with other vaults.",
        source: "Missing",
        target: "Own copy",
      };
    case "broken":
      return {
        label: "Broken link",
        meaning: "The link points to its expected source, but that source is missing.",
        next: "Restore the source item or choose **Remove Broken Link**.",
        source: "Missing",
        target: "Broken link",
      };
    case "foreign-link":
      return {
        label: "Link to another location",
        meaning: "This link points somewhere other than the matching item in the Default Vault.",
        next: "Inspect this link before changing it. Automatic replacement is unavailable.",
        source: "Unverified",
        target: "External link",
      };
  }
}

function overview(item: VaultItem, historyCount: number, relationPath?: string, comparison?: string): string {
  const state = stateInfo(item);
  const itemLocation = ".obsidian/" + relativeItemPath(item).replaceAll("\\", "/");
  return [
    "# " + plain(item.name),
    "**" + plain(item.category) + "** · Target: " + plain(basename(item.targetVault)),
    "## " + state.label,
    relationPath
      ? `![Relationship between the Default and Target vaults](<${relationPath}?t=${Date.now()}>)`
      : "Loading vault relationship…",
    state.meaning,
    "**Item path:** " + plain(itemLocation),
    ...(comparison
      ? [
          "## Comparison · Default Vault → " + plain(basename(item.targetVault)),
          comparison,
          ...(item.state === "native-branched"
            ? ["**Choose specific changes:** open Actions and select **Choose Specific Changes to Sync** (⌘⌥S)."]
            : []),
        ]
      : []),
    "### Next step",
    state.next,
    historyCount > 0
      ? "**" +
        historyCount +
        " saved " +
        (historyCount === 1 ? "version" : "versions") +
        "** of the Default Vault item appear in the history list."
      : "No saved versions of this item are available yet.",
  ].join("\n\n");
}

function visualCards(visuals: DiffVisuals | undefined, pending: boolean, fallback: string): string {
  if (pending) return "Preparing the side-by-side diff…";
  if (!visuals) return fallback;
  if (visuals.files.length === 0) return "No text changes are available to display.";
  return [
    ...visuals.files.map((file) => "![Side-by-side changes in " + plain(file.name) + "](<" + file.path + ">)"),
    ...(visuals.hiddenFiles > 0
      ? [String(visuals.hiddenFiles) + " more changed files are available under **View Technical Diff**."]
      : []),
    "Red is the earlier or Default Vault copy. Green is the later or Target Vault copy. Open **View Technical Diff** for complete lines.",
  ].join("\n\n");
}

type PatchSummary = { files: string[]; added: string[]; removed: string[]; binary: boolean };

function simplifyLine(value: string): string {
  const trimmed = value.trim().replace(/,$/, "");
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") return String(parsed);
  } catch {
    // Retain non-JSON text.
  }
  return trimmed;
}

function summarizePatch(patch: string): PatchSummary {
  const files: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  let binary = false;
  for (const line of patch.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
      if (match) {
        const marker = match[2].indexOf(".obsidian/");
        files.push(marker >= 0 ? match[2].slice(marker + ".obsidian/".length) : match[2]);
      }
    } else if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      binary = true;
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      added.push(simplifyLine(line.slice(1)));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removed.push(simplifyLine(line.slice(1)));
    }
  }
  // An unchanged JSON array entry can appear on both sides when its trailing comma moves.
  for (let index = added.length - 1; index >= 0; index--) {
    const matching = removed.indexOf(added[index]);
    if (matching >= 0) {
      added.splice(index, 1);
      removed.splice(matching, 1);
    }
  }
  return { files: [...new Set(files)], added, removed, binary };
}

function readableChanges(patch: string, emptyMessage: string): string {
  if (!patch.trim() || patch === "No content differences.") return emptyMessage;
  const summary = summarizePatch(patch);
  const added = summary.added.filter((line) => line && !["[", "]", "{", "}"].includes(line));
  const removed = summary.removed.filter((line) => line && !["[", "]", "{", "}"].includes(line));
  const parts: string[] = [];
  if (summary.files.length > 0) {
    parts.push(
      "**" +
        summary.files.length +
        (summary.files.length === 1 ? " file" : " files") +
        " affected**" +
        (summary.files.length <= 5 ? ": " + summary.files.map((file) => plain(file)).join(", ") : "."),
    );
  }
  if (added.length > 0) {
    parts.push(
      "### Added (" + added.length + ")",
      ...added.slice(0, 6).map((line) => "- " + plain(line.slice(0, 140))),
    );
    if (added.length > 6) parts.push("- …and " + (added.length - 6) + " more");
  }
  if (removed.length > 0) {
    parts.push(
      "### Removed or replaced (" + removed.length + ")",
      ...removed.slice(0, 6).map((line) => "- " + plain(line.slice(0, 140))),
    );
    if (removed.length > 6) parts.push("- …and " + (removed.length - 6) + " more");
  }
  if (summary.binary) parts.push("Some changed files are binary and cannot be summarized as text.");
  if (added.length === 0 && removed.length === 0 && !summary.binary) {
    parts.push(
      "No values were added or removed. Their order or formatting may have changed. Open the technical diff for exact lines.",
    );
  }
  return parts.join("\n\n");
}

function technicalDiff(patch: string): string {
  const fence = String.fromCharCode(96).repeat(3);
  const body = patch.length > 120_000 ? patch.slice(0, 120_000) + "\n…diff truncated for display" : patch;
  return (
    "# Technical diff\n\nThis is the original Git output.\n\n" +
    fence +
    "diff\n" +
    (body || "No diff available.") +
    "\n" +
    fence
  );
}

function diffFileName(header: string): string {
  const match = /^diff --git a\/(.+) b\/(.+)$/.exec(header);
  const fullPath = match?.[2] ?? "Changed file";
  const marker = fullPath.indexOf(".obsidian/");
  return marker >= 0 ? fullPath.slice(marker + ".obsidian/".length) : fullPath;
}

function visualDiff(patch: string, emptyMessage: string): string {
  if (!patch.trim() || patch === "No content differences.") return emptyMessage;
  const sections = patch.split(/(?=^diff --git )/m).filter((section) => section.startsWith("diff --git "));
  if (sections.length === 0) return "A line-by-line diff is unavailable. The technical output is available in Actions.";
  const fence = String.fromCharCode(96).repeat(3);
  const result: string[] = [];
  let shownLines = 0;
  for (const section of sections.slice(0, 6)) {
    const lines = section.split(/\r?\n/);
    const file = diffFileName(lines[0]);
    const changed: string[] = [];
    let inHunk = false;
    for (const line of lines.slice(1)) {
      if (line.startsWith("@@")) {
        if (changed.length > 0) changed.push("  …");
        inHunk = true;
      } else if (
        inHunk &&
        (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) &&
        !line.startsWith("+++") &&
        !line.startsWith("---")
      ) {
        changed.push(line);
        shownLines++;
      }
      if (shownLines >= 100 || changed.join("\n").length >= 12_000) break;
    }
    result.push("### " + plain(file));
    if (changed.length > 0) {
      result.push(fence + "diff\n" + changed.join("\n") + "\n" + fence);
    } else {
      result.push(
        section.includes("Binary files ") ? "Binary file changed." : "No text lines are available for this file.",
      );
    }
    if (shownLines >= 100) break;
  }
  if (sections.length > 6 || shownLines >= 100)
    result.push("More changes are available under **View Technical Diff**.");
  return result.join("\n\n");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function writeHistoryGraph(item: VaultItem, commits: GitCommit[]): Promise<string> {
  const recent = commits.slice(0, 6).reverse();
  const lastY = 88 + (recent.length - 1) * 66;
  const height = lastY + 92;
  const color = item.state === "linked" ? "#58c783" : item.state === "native-branched" ? "#ffb454" : "#76b9ef";
  const nodes = recent
    .map((commit, index) => {
      const y = 88 + index * 66;
      const subject = friendlySubject(commit.subject);
      const label = subject.length > 38 ? subject.slice(0, 35) + "…" : subject;
      return (
        '<circle cx="38" cy="' +
        y +
        '" r="7" fill="#70c9ee"/>' +
        '<text x="62" y="' +
        (y - 5) +
        '" fill="#f5f6f8" font-size="14" font-weight="600" font-family="system-ui">' +
        escapeXml(label) +
        "</text>" +
        '<text x="62" y="' +
        (y + 15) +
        '" fill="#aeb5bf" font-size="12" font-family="system-ui">' +
        escapeXml(shortDate(commit.date)) +
        "</text>"
      );
    })
    .join("");
  const connector =
    item.state === "linked" ? '<path d="M45 ' + lastY + ' H455" stroke="#58c783" stroke-width="2" fill="none"/>' : "";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="' +
    height +
    '" viewBox="0 0 720 ' +
    height +
    '">' +
    '<rect width="720" height="' +
    height +
    '" rx="16" fill="#202227"/>' +
    '<text x="30" y="37" fill="#f5f6f8" font-size="16" font-weight="700" font-family="system-ui">Default Vault saves</text>' +
    '<path d="M38 88 V' +
    lastY +
    '" stroke="#70c9ee" stroke-width="3" fill="none"/>' +
    nodes +
    connector +
    '<rect x="455" y="' +
    (lastY - 30) +
    '" width="235" height="62" rx="12" fill="#2e3138" stroke="' +
    color +
    '"/>' +
    '<text x="470" y="' +
    (lastY - 7) +
    '" fill="#aeb5bf" font-size="12" font-family="system-ui">Target vault now</text>' +
    '<text x="470" y="' +
    (lastY + 15) +
    '" fill="#f5f6f8" font-size="14" font-weight="600" font-family="system-ui">' +
    escapeXml(stateInfo(item).label) +
    "</text></svg>";
  const folder = join(environment.supportPath, "inspector-graphs");
  await mkdir(folder, { recursive: true });
  const name = createHash("sha256")
    .update(item.targetVault + ":" + item.id + ":" + item.state + ":" + recent.map((commit) => commit.hash).join(","))
    .digest("hex");
  const filePath = join(folder, name + ".svg");
  await writeFile(filePath, svg);
  return filePath;
}

export default function ItemInspector({
  item: initialItem,
  onChanged,
}: {
  item: VaultItem;
  onChanged?: () => Promise<unknown> | void;
}) {
  const { pop } = useNavigation();
  const { data: item = initialItem, revalidate: refreshCurrentItem } = usePromise(refreshItem, [initialItem, 0]);
  const relativePath = relativeItemPath(item);
  const [selectedId, setSelectedId] = useState("overview");
  const {
    data: history = [],
    isLoading: historyLoading,
    revalidate: refreshHistory,
  } = usePromise(getItemHistory, [item.defaultVault, relativePath]);
  const { data: relationPath } = usePromise(relationshipVisual, [item]);
  const { data: graphPath, isLoading: graphLoading } = usePromise(writeHistoryGraph, [item, history], {
    execute: !historyLoading && history.length > 0,
  });
  const canCompare = item.state === "native-branched" || item.state === "native-identical";
  const {
    data: liveDiff = "",
    isLoading: liveLoading,
    revalidate: refreshLiveDiff,
  } = usePromise(getItemDiff, [item], { execute: canCompare });
  const { data: currentVisuals, isLoading: currentVisualsLoading } = usePromise(
    sideBySideDiffs,
    [liveDiff, item.id + ":current", "Default Vault", basename(item.targetVault)],
    { execute: item.state === "native-branched" && !liveLoading && Boolean(liveDiff) },
  );
  const { data: commitDiff = "", isLoading: commitLoading } = usePromise(
    getCommitDiff,
    [item.defaultVault, relativePath, selectedId],
    { execute: /^[a-f0-9]{40}$/i.test(selectedId) },
  );
  const selectedCommit = history.find((commit) => commit.hash === selectedId);
  const { data: savedVisuals, isLoading: savedVisualsLoading } = usePromise(
    sideBySideDiffs,
    [commitDiff, item.id + ":" + selectedId, "Before this save", "After this save"],
    { execute: Boolean(selectedCommit) && !commitLoading && Boolean(commitDiff) },
  );

  async function act(title: string, action: () => Promise<void>) {
    try {
      await action();
      await showToast({ style: Toast.Style.Success, title });
      onChanged?.();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: title + " failed", message: String(error) });
    }
  }

  const canPush =
    item.category !== "settings" &&
    (item.state === "native-unique" || item.state === "native-identical" || item.state === "native-branched");
  const canPull =
    item.category !== "settings" &&
    (item.state === "available" || item.state === "native-identical" || item.state === "native-branched");
  const patch = selectedCommit ? commitDiff : liveDiff;
  const markdown =
    selectedId === "history-graph"
      ? [
          "# History graph",
          "Saved versions of this item in the Default Vault appear from oldest to newest. The box at the right shows the target vault's current state.",
          graphPath ? "![Saved versions and current target state](<" + graphPath + ">)" : "Preparing the graph…",
          item.state === "native-branched" || item.state === "native-identical"
            ? "The target has a separate file. Its local edits are not Git commits in this timeline."
            : "",
        ].join("\n\n")
      : selectedCommit
        ? [
            "# Saved " + plain(shortDate(selectedCommit.date)),
            "**" + plain(friendlySubject(selectedCommit.subject)) + "**",
            "This is a saved version of the item in the Default Vault.",
            "## What changed in this save",
            readableChanges(commitDiff, "No text changes were recorded for this item in this save."),
            "## Side-by-side diff for this save",
            visualCards(
              savedVisuals,
              commitLoading || savedVisualsLoading,
              visualDiff(commitDiff, "There are no text lines to show for this saved version."),
            ),
            "To restore this version to the Default Vault, choose **Restore this saved version** from the action menu.",
          ].join("\n\n")
        : overview(
            item,
            history.length,
            relationPath,
            item.state === "native-identical"
              ? "The two copies currently match. They remain separate files."
              : item.state === "native-branched"
                ? visualCards(
                    currentVisuals,
                    liveLoading || currentVisualsLoading,
                    visualDiff(liveDiff, "A text diff is unavailable for these copies."),
                  )
                : undefined,
          );

  const actions = (
    <ActionPanel>
      <ActionPanel.Section title="Inspect">
        <Action.Push
          title={
            selectedCommit
              ? "Read Saved Version"
              : selectedId === "history-graph"
                ? "View History Graph"
                : "Read Current State"
          }
          icon={Icon.Eye}
          target={<Detail navigationTitle={"Inspect · " + item.name} markdown={markdown} />}
        />
      </ActionPanel.Section>
      {selectedId === "overview" && item.state === "native-branched" && (
        <ActionPanel.Section title="Compare and Sync">
          <Action.Push
            title="Choose Specific Changes to Sync"
            icon={Icon.ArrowRight}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            target={
              <SelectiveSync
                item={item}
                onChanged={async () => {
                  await Promise.all([refreshCurrentItem(), refreshLiveDiff(), refreshHistory()]);
                  await onChanged?.();
                }}
              />
            }
          />
        </ActionPanel.Section>
      )}
      <ActionPanel.Section title="Item Actions">
        {item.state === "linked" && (
          <Action
            title="Detach and Keep Local Copy"
            icon={Icon.Document}
            onAction={() => void act("Detached from Default Vault", () => detachItem(item))}
          />
        )}
        {item.state === "broken" && (
          <Action
            title="Remove Broken Link"
            icon={Icon.Trash}
            onAction={() =>
              void (async () => {
                const confirmed = await confirmAlert({
                  title: "Remove broken link?",
                  message:
                    "Only the broken link for " + item.name + " in " + basename(item.targetVault) + " will be removed.",
                  primaryAction: { title: "Remove Link", style: Alert.ActionStyle.Destructive },
                });
                if (confirmed) await act("Removed broken link", () => unlinkItem(item, true));
              })()
            }
          />
        )}
        {canPull && (
          <Action
            title="Link from Default Vault"
            icon={Icon.ArrowDown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() =>
              void (async () => {
                const replacesNative = item.state !== "available";
                if (replacesNative) {
                  const confirmed = await confirmAlert({
                    title: "Replace this vault's copy?",
                    message:
                      item.name +
                      " in " +
                      basename(item.targetVault) +
                      " will be replaced with a link to the Default Vault.",
                    primaryAction: { title: "Replace and Link", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                }
                await act("Linked from Default Vault", () => pullItem(item, replacesNative));
              })()
            }
          />
        )}
        {canPush && (
          <Action
            title={item.state === "native-unique" ? "Move to Default Vault and Link" : "Push Local to Default"}
            icon={Icon.ArrowUp}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() =>
              void (async () => {
                const confirmed = await confirmAlert({
                  title: "Use this vault's copy as the source?",
                  message:
                    "The Default Vault's " +
                    item.name +
                    " will be replaced if present. This vault's copy will become a link to it.",
                  primaryAction: { title: "Push and Link", style: Alert.ActionStyle.Destructive },
                });
                if (confirmed) await act("Pushed local copy", () => pushItem(item, true));
              })()
            }
          />
        )}
        {canPull && (
          <Action
            title={item.state === "available" ? "Pull Copy from Default" : "Pull Copy from Default (Overwrite Local)"}
            icon={Icon.Document}
            onAction={() =>
              void (async () => {
                const replacesNative = item.state !== "available";
                if (replacesNative) {
                  const confirmed = await confirmAlert({
                    title: "Replace this vault's copy?",
                    message: `${item.name} in ${basename(item.targetVault)} will be replaced with an independent copy from the Default Vault.`,
                    primaryAction: { title: "Pull Copy", style: Alert.ActionStyle.Destructive },
                  });
                  if (!confirmed) return;
                }
                await act("Copied from Default Vault", () => pullCopyItem(item, replacesNative));
              })()
            }
          />
        )}
        {selectedCommit && (
          <Action
            title="Restore This Saved Version"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() =>
              void (async () => {
                const confirmed = await confirmAlert({
                  title: "Restore this saved version?",
                  message:
                    "The Default Vault's " +
                    item.name +
                    " will be restored to the version saved " +
                    shortDate(selectedCommit.date) +
                    ". Linked vaults will use the restored content.",
                  primaryAction: { title: "Restore", style: Alert.ActionStyle.Destructive },
                });
                if (confirmed)
                  await act("Restored saved version", () =>
                    revertItem(item.defaultVault, relativePath, selectedCommit.hash, true),
                  );
              })()
            }
          />
        )}
      </ActionPanel.Section>
      {((selectedId === "overview" && item.state === "native-branched") || selectedCommit) && (
        <ActionPanel.Section title="Advanced">
          <Action.Push
            title="View Technical Diff"
            icon={Icon.Document}
            target={<Detail navigationTitle={"Technical Diff · " + item.name} markdown={technicalDiff(patch)} />}
          />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );

  return (
    <List
      navigationTitle={"Inspect · " + item.name}
      searchBarPlaceholder="Search saved versions..."
      isShowingDetail
      isLoading={historyLoading}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? "overview")}
    >
      <List.Section title="This Vault">
        <List.Item
          id="overview"
          title="Current state"
          subtitle={stateInfo(item).label}
          icon={Icon.Eye}
          detail={<List.Item.Detail markdown={markdown} />}
          actions={actions}
        />
      </List.Section>
      {history.length > 0 && (
        <List.Section title="Saved Versions · Default Vault">
          <List.Item
            id="history-graph"
            title="History graph"
            subtitle="Saved versions and this vault's current state"
            icon={Icon.BarChart}
            detail={<List.Item.Detail isLoading={graphLoading} markdown={markdown} />}
            actions={actions}
          />
          {history.map((commit: GitCommit) => (
            <List.Item
              key={commit.hash}
              id={commit.hash}
              title={"Saved " + shortDate(commit.date)}
              subtitle={friendlySubject(commit.subject)}
              icon={Icon.Clock}
              detail={<List.Item.Detail isLoading={commitLoading && selectedId === commit.hash} markdown={markdown} />}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
