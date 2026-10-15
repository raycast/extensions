import { setupActionTitle } from "./lib/copy";
// Dig Up Folders: what Dig Up searches. The folders, the folders skipped inside them, the code folders, the file types
// left out, and how long the first pass takes (DigUp: SettingsWindow.swift Folders and Code tabs, AddFolders.swift,
// FolderChoices.swift, CodeFolders.swift, Estimates.swift).

import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { getProgressIcon, showFailureToast } from "@raycast/utils";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, FolderEstimate, FolderSummary, Status } from "../engine/api";
import type { FileKind } from "../engine/types";
import { api } from "./lib/client";
import {
  ACCESS_NOTE,
  ADD_FOLDERS_INTRO,
  CODE_INTRO,
  CODE_NOTE,
  FULL_DISK_ACCESS_URL,
  MENU_BAR_HINT,
  PRIVACY_NOTE,
  TYPES_NOTE,
} from "./lib/copy";
import {
  USUAL_FOLDERS,
  addFolders,
  addSummary,
  extensionsText,
  isInside,
  parseExtensions,
  removeFolder,
  skipFolders,
  unskipFolder,
  type Change,
  type FolderLists,
  type Normalizer,
} from "./lib/folder-config";
import { approximately, baseName, formatCount, roughBytes, roughDuration, tildePath } from "./lib/format";
import {
  folderIndexedText,
  folderStatesText,
  folderTrouble,
  indexSummary,
  kindCountsText,
  kindLabel,
  progressOf,
  searchable,
  setupLine,
  setupProgressText,
  statusLine,
  summaryOf,
  troubleTag,
  type FolderTrouble,
} from "./lib/status-text";
import { useDaemonStatus, type DaemonStatus } from "./ui/hooks";
import { openLog } from "./ui/log";
import { preferencesSent } from "./ui/prefs";
import { KIND_ICONS, indexNow } from "./ui/result-parts";

const normalizer: Normalizer = {
  resolve: (path) => {
    try {
      return realpathSync(path);
    } catch {
      return path;
    }
  },
};

/** A folder's path as it compares: symlinks resolved, no trailing slash. */
function samePath(path: string): string {
  const resolved = normalizer.resolve(path);
  return resolved.length > 1 ? resolved.replace(/\/+$/, "") : resolved;
}

type Estimate = FolderEstimate | "failed";
type Access = { readable: boolean; error?: string };

function signature(paths: string[]): string {
  return paths.join("\n");
}

/**
 * Estimates for `folders`, asked of the daemon for the folders it hasn't estimated yet. They're asked again when the
 * skips or skipped types (`settings`) change, and a reply for an older set is dropped (DigUp: FolderChoices.swift).
 */
function useEstimates(folders: string[], code: boolean, settings: string): Map<string, Estimate> {
  const [state, setState] = useState<{ settings: string; estimates: Map<string, Estimate> }>({
    settings,
    estimates: new Map(),
  });
  const estimates = state.settings === settings ? state.estimates : new Map<string, Estimate>();
  const missing = folders.filter((folder) => !estimates.has(folder));
  const key = `${settings}\n\n${signature(missing)}`;
  useEffect(() => {
    if (missing.length === 0) return;
    const abort = new AbortController();
    const settle = (replies: FolderEstimate[]) =>
      setState((before) => {
        const next = new Map(before.settings === settings ? before.estimates : []);
        // Matched by the resolved path, so a reply that spells its folder differently still lands on it.
        const byFolder = new Map(replies.map((reply) => [samePath(reply.folder), reply]));
        for (const folder of missing) next.set(folder, byFolder.get(samePath(folder)) ?? "failed");
        return { settings, estimates: next };
      });
    api("POST /estimate", { folders: missing, code }, { signal: abort.signal, timeoutMs: 600_000 }).then(
      settle,
      () => abort.signal.aborted || settle([]),
    );
    return () => abort.abort();
  }, [key, code]);
  return estimates;
}

/** The chosen folders and code folders that are skipped now: not connected (`missing`), or not readable. */
function troublesOf(
  folders: string[],
  codeFolders: string[],
  status: Status | null,
  access: Map<string, Access>,
): Record<FolderTrouble, string[]> {
  const out: Record<FolderTrouble, Set<string>> = { missing: new Set(), unreadable: new Set() };
  for (const [list, code] of [
    [folders, false],
    [codeFolders, true],
  ] as const) {
    for (const folder of list) {
      const trouble = folderTrouble(folder, code, status, access.get(folder));
      if (trouble) out[trouble].add(folder);
    }
  }
  return { missing: [...out.missing], unreadable: [...out.unreadable] };
}

/** "1,204 " for a removal's “Its 1,204 files leave the index”: the files in the index (DigUp), else the estimate's. */
function filesText(summary: FolderSummary | undefined, estimate: Estimate | undefined): string {
  if (summary && summary.files > 0) return `${formatCount(summary.files)} `;
  return estimate && estimate !== "failed" ? `${formatCount(estimate.files)} ` : "";
}

/** DigUp's “Allow in Settings…” on a folder macOS doesn't let Dig Up read. */
function AllowAction() {
  return <Action title="Allow in Settings…" icon={Icon.Lock} onAction={() => open(FULL_DISK_ACCESS_URL)} />;
}

export default function Command(props: LaunchProps<{ launchContext?: { focus?: string } }>) {
  const daemon = useDaemonStatus();
  const { status } = daemon;
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [suggestedCode, setSuggestedCode] = useState<string[] | null>(null);
  const [access, setAccess] = useState<Map<string, Access>>(new Map());

  const loadConfig = async () => {
    try {
      setConfig(await api("GET /config"));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  };

  useEffect(() => {
    void loadConfig();
    void preferencesSent();
    api("POST /suggest-code-folders", {}, { timeoutMs: 60_000 }).then(setSuggestedCode, () => setSuggestedCode([]));
  }, []);

  const folders = config?.folders ?? [];
  const skipped = config?.skipped ?? [];
  const codeFolders = config?.codeFolders ?? [];
  const codeSkipped = config?.codeSkipped ?? [];
  const home = homedir();

  // The usual folders (Desktop, Documents, …) that exist and aren't searched yet. They aren't looked inside (no
  // estimate) until they're picked: Dig Up reads only the folders you choose, and macOS would ask about each.
  const usual = useMemo(
    () =>
      USUAL_FOLDERS.map((name) => normalizer.resolve(join(home, name))).filter(
        (path) =>
          existsSync(path) &&
          !folders.some((folder) => folder === path || isInside(path, folder)) &&
          !folders.some((folder) => isInside(folder, path)),
      ),
    [signature(folders)],
  );
  const settings = signature([...skipped, "|", ...codeSkipped, "|", ...(config?.excludedExtensions ?? [])]);
  const estimates = useEstimates(config ? folders : [], false, settings);
  const codeEstimates = useEstimates(codeFolders, true, settings);

  const checkAccess = async (announce: boolean) => {
    const all = [...folders, ...codeFolders];
    if (all.length === 0) {
      if (announce) await showToast({ style: Toast.Style.Success, title: "No folders to check yet" });
      return;
    }
    try {
      const replies = await api("POST /access", { folders: all });
      // Keyed by the folders asked about, whatever spelling the replies use.
      const byFolder = new Map(replies.map((reply) => [samePath(reply.folder), reply]));
      const states = new Map<string, Access>();
      for (const folder of all) {
        const reply = byFolder.get(samePath(folder));
        if (reply) states.set(folder, { readable: reply.readable, error: reply.error });
      }
      setAccess(states);
      // An unplugged drive is “Not connected”, not a matter of Full Disk Access: it's kept for when it's back.
      const troubles = troublesOf(folders, codeFolders, status, states);
      const blocked = troubles.unreadable;
      if (!announce && blocked.length === 0) return;
      if (blocked.length === 0) {
        const gone = troubles.missing;
        await showToast({
          style: Toast.Style.Success,
          title: gone.length > 0 ? "Dig Up can read all your connected folders" : "Dig Up can read all your folders",
          message:
            gone.length > 0
              ? `Not connected: ${gone.map((folder) => baseName(folder)).join(", ")}. Kept for when it's back.`
              : undefined,
        });
        return;
      }
      await showToast({
        style: Toast.Style.Failure,
        title: `macOS isn't letting Dig Up read “${baseName(blocked[0])}”${blocked.length > 1 ? ` and ${blocked.length - 1} more` : ""}`,
        message: "Give Raycast Full Disk Access, then quit and reopen Raycast.",
        primaryAction: { title: "Open Privacy Settings", onAction: () => open(FULL_DISK_ACCESS_URL) },
      });
    } catch (caught) {
      if (announce) await showFailureToast(caught, { title: "Dig Up couldn't check its access" });
    }
  };

  useEffect(() => {
    if (config) void checkAccess(false);
  }, [signature([...folders, ...codeFolders])]);

  /** Sends whole lists to the daemon (it prunes and syncs), then says what became of the picks. */
  const apply = async (change: Partial<Config>, notes: string[] = [], done?: string) => {
    try {
      // New folders start indexing, which the preferences govern (index hours, battery).
      await preferencesSent();
      setConfig(await api("POST /config", change));
      void daemon.refresh();
      if (notes.length > 0) {
        await showToast({
          style: Toast.Style.Success,
          title: notes[0],
          message: notes.slice(1).join(" ") || undefined,
        });
      } else if (done) {
        await showToast({ style: Toast.Style.Success, title: done });
      }
    } catch (caught) {
      await showFailureToast(caught, { title: "Dig Up couldn't save that" });
    }
  };
  const main: FolderLists = { chosen: folders, skipped };
  const code: FolderLists = { chosen: codeFolders, skipped: codeSkipped };
  const applyMain = (change: Change, done?: string) =>
    apply({ folders: change.chosen, skipped: change.skipped }, change.notes, done);
  const applyCode = (change: Change, done?: string) =>
    apply({ codeFolders: change.chosen, codeSkipped: change.skipped }, change.notes, done);

  const actions = {
    addFolders: (picked: string[]) => applyMain(addFolders(main, picked, normalizer), "Added: Dig Up reads them now"),
    skipFolders: (picked: string[]) => applyMain(skipFolders(main, picked, normalizer), "Skipped"),
    addCode: (picked: string[]) => applyCode(addFolders(code, picked, normalizer), "Added: Dig Up reads the code now"),
    skipCode: (picked: string[]) => applyCode(skipFolders(code, picked, normalizer), "Skipped"),
    setTypes: (text: string) =>
      apply({ excludedExtensions: parseExtensions(text) }, [], "Saved: those types leave the index"),
  };

  const removeMain = async (folder: string) => {
    const files = filesText(summaryOf(status, folder, false), estimates.get(folder));
    const sure = await confirmAlert({
      title: `Stop searching “${baseName(folder)}”?`,
      message: `Its ${files}files leave the index. Adding it back later indexes them again.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (sure) await applyMain(removeFolder(main, folder), `Stopped searching “${baseName(folder)}”`);
  };
  const removeCode = async (folder: string) => {
    const files = filesText(summaryOf(status, folder, true), codeEstimates.get(folder));
    const sure = await confirmAlert({
      title: `Stop searching the code in “${baseName(folder)}”?`,
      message: `Its ${files}code files leave the code index.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (sure) await applyCode(removeFolder(code, folder), `Stopped searching the code in “${baseName(folder)}”`);
  };
  const turnOffCode = async () => {
    const sure = await confirmAlert({
      title: "Turn off code search?",
      message: "The code index is deleted. Turning it on again reads the code again.",
      primaryAction: { title: "Turn Off", style: Alert.ActionStyle.Destructive },
    });
    if (sure) await apply({ codeFolders: [], codeSkipped: [] }, [], "Code search is off");
  };

  if (!config) {
    return (
      <List isLoading={!error}>
        {error ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Dig Up's engine didn't start"
            description={error.message}
            actions={
              <ActionPanel>
                <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={loadConfig} />
                <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  }

  const blocked = troublesOf(folders, codeFolders, status, access).unreadable;
  const troubleOf = (folder: string, code: boolean) => folderTrouble(folder, code, status, access.get(folder));
  const pendingEstimates = folders.some((folder) => !estimates.has(folder));
  const firstCodeId = codeFolders.length > 0 ? `code:${codeFolders[0]}` : "code-empty";

  const common = (
    <ActionPanel.Section>
      <Action.Push
        title="Add Folders…"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<FolderPicker kind="add" settings={settings} onPick={actions.addFolders} />}
      />
      <Action.Push
        title="Edit Skipped Types…"
        icon={Icon.Filter}
        target={<SkippedTypesForm current={config.excludedExtensions} onSave={actions.setTypes} />}
      />
      <Action title="Check Access" icon={Icon.Lock} onAction={() => checkAccess(true)} />
      <Action title="Index Now" icon={Icon.ArrowClockwise} onAction={indexNow} />
      <Action title="Open Log" icon={Icon.Terminal} onAction={openLog} />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
  const codeCommon = (
    <ActionPanel.Section>
      <Action.Push
        title={codeFolders.length > 0 ? "Add Code Folders…" : "Choose Code Folders…"}
        icon={Icon.Plus}
        target={<FolderPicker kind="code" settings={settings} onPick={actions.addCode} />}
      />
      {codeFolders.length > 0 ? (
        <Action
          title="Turn off Code Search…"
          icon={Icon.MinusCircle}
          style={Action.Style.Destructive}
          onAction={turnOffCode}
        />
      ) : null}
      {/* The Code Editor preference: where code results open. */}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );

  return (
    <List
      isShowingDetail
      isLoading={pendingEstimates || suggestedCode === null || !status}
      selectedItemId={props.launchContext?.focus === "code" ? firstCodeId : undefined}
      searchBarPlaceholder="Filter folders"
    >
      <List.Section title="Index">
        {status ? (
          <IndexItem status={status} refresh={daemon.refresh} secondsLeft={daemon.secondsLeft} common={common} />
        ) : null}
        {blocked.length > 0 ? (
          <List.Item
            id="access"
            title="macOS isn't letting Dig Up read some folders"
            subtitle={blocked.map((folder) => baseName(folder)).join(", ")}
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            detail={<List.Item.Detail markdown={accessMarkdown(blocked, access)} />}
            actions={
              <ActionPanel>
                <Action title="Open Privacy Settings" icon={Icon.Lock} onAction={() => open(FULL_DISK_ACCESS_URL)} />
                <Action title="Check Access" icon={Icon.ArrowClockwise} onAction={() => checkAccess(true)} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>

      <List.Section title="Folders to Search" subtitle={folders.length > 0 ? formatCount(folders.length) : undefined}>
        {folders.length === 0 ? (
          <List.Item
            id="folders-empty"
            title="No folders yet"
            subtitle="Add the ones Dig Up should search."
            icon={Icon.Folder}
            detail={
              <List.Item.Detail
                markdown={`## No folders yet\n\nAdd the ones Dig Up should search.\n\n${ACCESS_NOTE}`}
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Folders…"
                  icon={Icon.Plus}
                  target={<FolderPicker kind="add" settings={settings} onPick={actions.addFolders} />}
                />
                {common}
              </ActionPanel>
            }
          />
        ) : null}
        {folders.map((folder) => (
          <FolderItem
            key={folder}
            id={`folder:${folder}`}
            folder={folder}
            estimate={estimates.get(folder)}
            summary={summaryOf(status, folder, false)}
            trouble={troubleOf(folder, false)}
            code={false}
            actions={
              <ActionPanel>
                {troubleOf(folder, false) === "unreadable" ? <AllowAction /> : null}
                <Action.ShowInFinder path={folder} />
                <Action.Push
                  title="Skip a Subfolder…"
                  icon={Icon.MinusCircle}
                  target={<FolderPicker kind="skip" onPick={actions.skipFolders} />}
                />
                <Action
                  title="Stop Searching This Folder"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => removeMain(folder)}
                />
                <Action title="Add as Code Folder" icon={Icon.Code} onAction={() => actions.addCode([folder])} />
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {usual.length > 0 ? (
        <List.Section title="Suggested Folders">
          {usual.map((folder) => (
            <FolderItem
              key={folder}
              id={`usual:${folder}`}
              folder={folder}
              code={false}
              suggestion
              actions={
                <ActionPanel>
                  <Action title="Add This Folder" icon={Icon.Plus} onAction={() => actions.addFolders([folder])} />
                  <Action
                    title="Add All Suggested Folders"
                    icon={Icon.PlusCircle}
                    onAction={() => actions.addFolders(usual)}
                  />
                  <Action.ShowInFinder path={folder} />
                  {common}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title="Skipped Folders">
        {skipped.length === 0 ? (
          <List.Item
            id="skipped-empty"
            title="None"
            subtitle="Code projects, app bundles and caches are skipped anyway."
            icon={Icon.MinusCircle}
            detail={
              <List.Item.Detail
                markdown={
                  "## Skip these folders\n\nNone. Code projects, app bundles and caches are skipped anyway (code has " +
                  "its own section below)."
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Skip a Folder…"
                  icon={Icon.MinusCircle}
                  target={<FolderPicker kind="skip" onPick={actions.skipFolders} />}
                />
                {common}
              </ActionPanel>
            }
          />
        ) : null}
        {skipped.map((folder) => (
          <List.Item
            key={folder}
            id={`skipped:${folder}`}
            title={baseName(folder)}
            subtitle={tildePath(folder)}
            icon={{ fileIcon: folder }}
            detail={
              <List.Item.Detail
                markdown={`## ${baseName(folder)}\n\n\`${tildePath(folder)}\`\n\nLeft out of the folders around it.`}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Search This Folder Again"
                  icon={Icon.PlusCircle}
                  onAction={() => applyMain(unskipFolder(main, folder), `Searching “${baseName(folder)}” again`)}
                />
                <Action.ShowInFinder path={folder} />
                <Action.Push
                  title="Skip a Folder…"
                  icon={Icon.MinusCircle}
                  target={<FolderPicker kind="skip" onPick={actions.skipFolders} />}
                />
                {common}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section
        title="Code Folders"
        subtitle={codeFolders.length > 0 ? formatCount(codeFolders.length) : undefined}
      >
        {codeFolders.length === 0 ? (
          <List.Item
            id="code-empty"
            title="No code folders yet"
            subtitle="Add the folders that hold your projects."
            icon={KIND_ICONS.code}
            detail={
              <List.Item.Detail
                markdown={`## Search your code\n\n${CODE_INTRO}\n\nNo code folders yet. Add the folders that hold your projects.\n\n${CODE_NOTE}`}
              />
            }
            actions={<ActionPanel>{codeCommon}</ActionPanel>}
          />
        ) : null}
        {codeFolders.map((folder) => (
          <FolderItem
            key={folder}
            id={`code:${folder}`}
            folder={folder}
            estimate={codeEstimates.get(folder)}
            summary={summaryOf(status, folder, true)}
            trouble={troubleOf(folder, true)}
            code
            actions={
              <ActionPanel>
                {troubleOf(folder, true) === "unreadable" ? <AllowAction /> : null}
                <Action.ShowInFinder path={folder} />
                <Action.Push
                  title="Skip a Subfolder…"
                  icon={Icon.MinusCircle}
                  target={<FolderPicker kind="skipCode" onPick={actions.skipCode} />}
                />
                <Action
                  title="Stop Searching This Code"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => removeCode(folder)}
                />
                {codeCommon}
              </ActionPanel>
            }
          />
        ))}
        {codeSkipped.map((folder) => (
          <List.Item
            key={folder}
            id={`code-skipped:${folder}`}
            title={baseName(folder)}
            subtitle={`Skipped · ${tildePath(folder)}`}
            icon={Icon.MinusCircle}
            detail={<List.Item.Detail markdown={`## ${baseName(folder)}\n\nLeft out of the code index.`} />}
            actions={
              <ActionPanel>
                <Action
                  title="Search This Code Again"
                  icon={Icon.PlusCircle}
                  onAction={() =>
                    applyCode(unskipFolder(code, folder), `Searching the code in “${baseName(folder)}” again`)
                  }
                />
                <Action.ShowInFinder path={folder} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <SuggestedCode
        suggestions={suggestedCode ?? []}
        codeFolders={codeFolders}
        onAdd={(folder) => actions.addCode([folder])}
      />

      <List.Section title="Skipped File Types">
        <List.Item
          id="types"
          title={config.excludedExtensions.length > 0 ? extensionsText(config.excludedExtensions) : "None"}
          subtitle="e.g. heic, txt"
          icon={Icon.Filter}
          detail={
            <List.Item.Detail
              markdown={`## Skip these file types\n\n${
                config.excludedExtensions.length > 0
                  ? `Left out: ${extensionsText(config.excludedExtensions)}.`
                  : "None: every kind Dig Up reads is searched."
              }\n\n${TYPES_NOTE}`}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Skipped Types…"
                icon={Icon.Pencil}
                target={<SkippedTypesForm current={config.excludedExtensions} onSave={actions.setTypes} />}
              />
              {common}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function accessMarkdown(blocked: string[], access: Map<string, Access>): string {
  const lines = blocked.map((folder) => {
    const reason = access.get(folder)?.error;
    return `- \`${tildePath(folder)}\`${reason ? `: ${reason}` : ""}`;
  });
  return [
    "## macOS isn't letting Dig Up read these folders",
    lines.join("\n"),
    "Dig Up reads your files through Raycast, so macOS asks on Raycast's behalf. Give **Raycast** Full Disk Access " +
      "(System Settings → Privacy & Security → Full Disk Access), or allow it the folder under Files and Folders. " +
      "Then quit and reopen Raycast, so Dig Up's engine starts again with the new access.",
    ACCESS_NOTE,
  ].join("\n\n");
}

interface IndexItemProps {
  status: Status;
  refresh: DaemonStatus["refresh"];
  secondsLeft: number | null;
  common: ReactElement;
}

/** DigUp's Settings → Folders index block: the status line, the counts, Pause / Resume. */
function IndexItem({ status, refresh, secondsLeft, common }: IndexItemProps) {
  const paused = status.held === "paused";
  const progress = progressOf(status);
  const summary = indexSummary(status.main);
  const codeSummary = indexSummary(status.code, "code files");
  const setupText = setupProgressText(status.setup, secondsLeft);
  const togglePause = async () => {
    try {
      await preferencesSent();
      await api("POST /pause", { paused: !paused });
      await refresh();
      await showToast({ style: Toast.Style.Success, title: paused ? "Indexing resumed" : "Indexing paused" });
    } catch (caught) {
      await showFailureToast(caught, { title: "Dig Up couldn't change that" });
    }
  };
  const setUp = async () => {
    try {
      // With the Model Folder preference pointing at the model, nothing needs downloading.
      await preferencesSent();
      await api("POST /setup", {});
      await refresh({ setupAsked: true });
    } catch (caught) {
      await showFailureToast(caught, { title: "Dig Up couldn't start the download" });
    }
  };
  const kinds = Object.entries(status.main.byKind) as Array<[FileKind, (typeof status.main.byKind)[FileKind]]>;
  return (
    <List.Item
      id="index"
      title={statusLine(status)}
      subtitle={summary ?? undefined}
      icon={progress !== null ? getProgressIcon(progress) : paused ? Icon.Pause : Icon.CheckCircle}
      detail={
        <List.Item.Detail
          markdown={[
            `## ${statusLine(status)}`,
            status.setup.state !== "ready" ? `**${setupLine(status.setup)}**${setupText ? ` · ${setupText}` : ""}` : "",
            status.lastError ? `**Last problem:** ${status.lastError.message}` : "",
            PRIVACY_NOTE,
            MENU_BAR_HINT,
          ]
            .filter(Boolean)
            .join("\n\n")}
          metadata={
            <List.Item.Detail.Metadata>
              {summary ? <List.Item.Detail.Metadata.Label title="Files" text={summary} /> : null}
              {codeSummary ? <List.Item.Detail.Metadata.Label title="Code" text={codeSummary} /> : null}
              <List.Item.Detail.Metadata.Separator />
              {kinds.map(([kind, counts]) =>
                counts && counts.files > 0 ? (
                  <List.Item.Detail.Metadata.Label
                    key={kind}
                    title={kindLabel(kind)}
                    icon={KIND_ICONS[kind]}
                    text={`${formatCount(searchable(counts))} of ${formatCount(counts.files)}`}
                  />
                ) : null,
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action
            title={paused ? "Resume Indexing" : "Pause Indexing"}
            icon={paused ? Icon.Play : Icon.Pause}
            onAction={togglePause}
          />
          {status.setup.state === "missing" || status.setup.state === "failed" ? (
            <Action title={setupActionTitle(status.setup)} icon={Icon.Download} onAction={setUp} />
          ) : null}
          {common}
        </ActionPanel>
      }
    />
  );
}

interface FolderItemProps {
  id: string;
  folder: string;
  /** Searched folders only: a suggestion isn't looked inside until it's picked. */
  estimate?: Estimate;
  /** What the index holds under it (DigUp's Settings row), when the daemon sent that. */
  summary?: FolderSummary;
  trouble?: FolderTrouble | null;
  code: boolean;
  suggestion?: boolean;
  actions: ReactElement;
}

/**
 * A folder: what the index holds of it and what still waits (DigUp: SettingsWindow FolderStatusRow), with an orange
 * `Not connected` or `No access`; before its first pass finds anything, how long that pass takes.
 */
function FolderItem({ id, folder, estimate, summary, trouble = null, code, suggestion, actions }: FolderItemProps) {
  // A folder just added counts nothing yet: its estimate says more until the first pass finds its files.
  const shown = summary && (summary.files > 0 || trouble) ? summary : undefined;
  const accessories: List.Item.Accessory[] = [];
  if (trouble) accessories.push({ tag: { value: troubleTag(trouble), color: Color.Orange } });
  if (shown) {
    accessories.push({ text: folderIndexedText(shown, trouble), tooltip: folderStatesText(shown) || undefined });
  } else if (!suggestion && !trouble) {
    accessories.push(estimateAccessory(estimate, code));
  }
  return (
    <List.Item
      id={id}
      title={baseName(folder)}
      subtitle={tildePath(folder)}
      // DigUp shows a drive's icon, dimmed, for a folder that isn't there.
      icon={{ fileIcon: trouble === "missing" ? "/Volumes" : folder }}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={folderMarkdown(folder, estimate, shown, trouble, code, suggestion)}
          metadata={folderMetadata(estimate, shown, trouble, code)}
        />
      }
      actions={actions}
    />
  );
}

/** A searched folder's first pass at a glance: "≈ 4 min", "…" while it's looked at. */
function estimateAccessory(estimate: Estimate | undefined, code: boolean): List.Item.Accessory {
  if (estimate === undefined) return { text: "…", tooltip: "Looking at your folders…" };
  if (estimate === "failed") return { icon: Icon.QuestionMark, tooltip: "Couldn't look inside it" };
  if (estimate.files === 0) return { text: "—", tooltip: code ? "No code here" : "Nothing to search here yet" };
  return { text: approximately(estimate.seconds), tooltip: `First pass: about ${roughDuration(estimate.seconds)}` };
}

function folderMarkdown(
  folder: string,
  estimate: Estimate | undefined,
  summary: FolderSummary | undefined,
  trouble: FolderTrouble | null,
  code: boolean,
  suggestion?: boolean,
): string {
  const lines = [`## ${baseName(folder)}`, `\`${tildePath(folder)}\``];
  if (trouble === "missing") lines.push(`**${troubleTag(trouble)}**`);
  if (trouble === "unreadable") {
    lines.push(
      "**macOS isn't letting Dig Up read it.** Give Raycast Full Disk Access in System Settings → Privacy & " +
        "Security, then quit and reopen Raycast.",
    );
  }
  if (suggestion) {
    lines.push(ADD_FOLDERS_INTRO, ACCESS_NOTE);
    return lines.join("\n\n");
  }
  if (summary) {
    const states = folderStatesText(summary);
    lines.push(`**${folderIndexedText(summary, trouble)}**${states ? ` · ${states}` : ""}`);
    const kinds = kindCountsText(summary.byKind);
    if (kinds) lines.push(kinds);
  }
  // What a first pass takes says nothing about a folder that's skipped now.
  if (trouble) {
    if (code) lines.push(CODE_NOTE);
    return lines.join("\n\n");
  }
  if (estimate === undefined) lines.push(code ? "Looking at your code…" : "Looking at your folders…");
  else if (estimate === "failed") lines.push("Couldn't look inside it; it can still be searched.");
  else if (estimate.files === 0) lines.push(code ? "No code here" : "Nothing to search here yet");
  else {
    const time = estimate.seconds < 1 ? "under a second" : `about ${roughDuration(estimate.seconds)}`;
    if (code) {
      lines.push(`Adds ${time} of indexing${estimate.bytes ? ` and ${roughBytes(estimate.bytes)}` : ""}.`);
    } else {
      const later =
        estimate.laterSeconds >= 30 ? `, and ${roughDuration(estimate.laterSeconds)} more for long files` : "";
      lines.push(`**First pass:** ${time}${later}.`);
      if (estimate.laterSeconds >= 30) {
        lines.push("Long PDFs and documents get their first pages in that time, and the rest afterwards.");
      }
    }
  }
  if (code) lines.push(CODE_NOTE);
  return lines.join("\n\n");
}

function folderMetadata(
  estimate: Estimate | undefined,
  summary: FolderSummary | undefined,
  trouble: FolderTrouble | null,
  code: boolean,
): ReactElement | undefined {
  const estimated = !trouble && estimate && estimate !== "failed" && estimate.files > 0 ? estimate : undefined;
  if (!summary && !estimated) return undefined;
  const kinds = Object.entries(summary ? summary.byKind : (estimated?.byKind ?? {})).filter(
    ([, n]) => (n ?? 0) > 0,
  ) as Array<[FileKind, number]>;
  const states: Array<[string, number]> = summary
    ? [
        ["Waiting", summary.pending],
        ["Long files to finish", summary.unfinished],
        ["Skipped", summary.skipped],
        ["Couldn't be read", summary.failed],
      ]
    : [];
  const skipped = estimated ? Object.entries(estimated.skipped).filter(([, n]) => n > 0) : [];
  return (
    <List.Item.Detail.Metadata>
      {summary ? (
        <List.Item.Detail.Metadata.Label
          title="Indexed"
          text={`${formatCount(summary.indexed)} of ${formatCount(summary.files)}`}
        />
      ) : (
        <List.Item.Detail.Metadata.Label
          title={code ? "Code files" : "Files"}
          text={formatCount(estimated?.files ?? 0)}
        />
      )}
      {kinds.map(([kind, n]) => (
        <List.Item.Detail.Metadata.Label
          key={kind}
          title={kindLabel(kind)}
          icon={KIND_ICONS[kind]}
          text={formatCount(n)}
        />
      ))}
      {states
        .filter(([, n]) => n > 0)
        .map(([title, n]) => (
          <List.Item.Detail.Metadata.Label key={title} title={title} text={formatCount(n)} />
        ))}
      {estimated ? <List.Item.Detail.Metadata.Separator /> : null}
      {estimated ? (
        <List.Item.Detail.Metadata.Label title="First pass" text={approximately(estimated.seconds)} />
      ) : null}
      {estimated && !code && estimated.laterSeconds >= 30 ? (
        <List.Item.Detail.Metadata.Label
          title="Later, long files"
          text={`+ ${roughDuration(estimated.laterSeconds)}`}
        />
      ) : null}
      {estimated && code && estimated.bytes ? (
        <List.Item.Detail.Metadata.Label title="Index size" text={roughBytes(estimated.bytes)} />
      ) : null}
      {skipped.length > 0 ? <List.Item.Detail.Metadata.Separator /> : null}
      {skipped.map(([reason, n]) => (
        <List.Item.Detail.Metadata.Label key={reason} title={`Left out: ${reason}`} text={formatCount(n)} />
      ))}
    </List.Item.Detail.Metadata>
  );
}

function SuggestedCode({
  suggestions,
  codeFolders,
  onAdd,
}: {
  suggestions: string[];
  codeFolders: string[];
  onAdd: (folder: string) => void;
}) {
  const fresh = suggestions.filter(
    (folder) => !codeFolders.some((chosen) => chosen === folder || isInside(folder, chosen)),
  );
  if (fresh.length === 0) return null;
  return (
    <List.Section title="Suggested Code Folders">
      {fresh.map((folder) => (
        <List.Item
          key={folder}
          id={`suggested-code:${folder}`}
          title={baseName(folder)}
          subtitle={tildePath(folder)}
          icon={{ fileIcon: folder }}
          detail={
            <List.Item.Detail
              markdown={`## ${baseName(folder)}\n\n\`${tildePath(folder)}\`\n\nHolds git repositories.\n\n${CODE_INTRO}\n\n${CODE_NOTE}`}
            />
          }
          actions={
            <ActionPanel>
              <Action title="Add as Code Folder" icon={Icon.Code} onAction={() => onAdd(folder)} />
              <Action.ShowInFinder path={folder} />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}

type PickerKind = "add" | "skip" | "code" | "skipCode";

const PICKER_COPY: Record<PickerKind, { title: string; submit: string; text: string }> = {
  add: { title: "Add Folders to Search", submit: "Add Folders", text: ADD_FOLDERS_INTRO },
  skip: {
    title: "Skip Folders",
    submit: "Skip Folders",
    text: "Pick folders inside the ones Dig Up searches: their files leave the index.",
  },
  code: {
    title: "Search Your Code",
    submit: "Add Code Folders",
    text:
      "Pick the folders that hold your projects. Dig Up reads each once, then what changes. Code is searched on its " +
      "own: type code: in Dig Up.",
  },
  skipCode: {
    title: "Skip Code Folders",
    submit: "Skip Folders",
    text: "Pick folders inside your code folders: their code leaves the code index.",
  },
};

interface FolderPickerProps {
  kind: PickerKind;
  onPick: (paths: string[]) => Promise<void>;
  /** The skips and skipped types the estimates leave out (see useEstimates). */
  settings?: string;
}

/**
 * A folder picker (DigUp's NSOpenPanel): folders only, several at once. Adding says what the picked folders cost
 * before they're added (DigUp: AddFolders.swift summary); they're looked inside only once picked.
 */
function FolderPicker({ kind, onPick, settings = "" }: FolderPickerProps) {
  const { pop } = useNavigation();
  const copy = PICKER_COPY[kind];
  const adds = kind === "add" || kind === "code";
  const [picked, setPicked] = useState<string[]>([]);
  const estimates = useEstimates(adds ? picked : [], kind === "code", settings);
  const summary = adds
    ? addSummary(
        picked.map((folder) => estimates.get(folder)),
        kind === "code",
      )
    : null;
  return (
    <Form
      navigationTitle={copy.title}
      isLoading={adds && picked.some((folder) => !estimates.has(folder))}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={copy.submit}
            icon={Icon.Check}
            onSubmit={async (values: { folders: string[] }) => {
              const picked = values.folders ?? [];
              if (picked.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "Choose at least one folder" });
                return;
              }
              await onPick(picked);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={copy.text} />
      <Form.FilePicker
        id="folders"
        title="Folders"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection
        onChange={setPicked}
      />
      {summary ? <Form.Description text={summary} /> : null}
      {adds ? <Form.Description text={ACCESS_NOTE} /> : null}
    </Form>
  );
}

/** DigUp's "Skip these file types" field: "heic, .txt *.md" becomes heic, md, txt. */
function SkippedTypesForm({ current, onSave }: { current: string[]; onSave: (text: string) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Skip These File Types"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { types: string }) => {
              await onSave(values.types ?? "");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="types"
        title="File Types"
        placeholder="e.g. heic, txt"
        defaultValue={extensionsText(current)}
      />
      <Form.Description text="Files of these types leave the index. Separate them with commas or spaces." />
      <Form.Description text={TYPES_NOTE} />
    </Form>
  );
}
