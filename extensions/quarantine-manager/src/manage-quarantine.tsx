import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  existingPaths,
  getFileName,
  getFinderSelections,
  getQuarantineStatus,
  isDirectory,
  parseQuarantineData,
  parseQuarantineFlags,
  QuarantineStatus,
  removeAllAttributes,
  removeQuarantine,
  removeQuarantineFromPaths,
  scanDirectory,
  XattrInfo,
} from "./utils";

const LAST_SELECTION_KEY = "lastSelection";

type State =
  | { type: "selecting" }
  | { type: "loading" }
  | { type: "ready"; status: QuarantineStatus }
  | { type: "ready-group"; group: ScanGroup }
  | { type: "error"; message: string };

type SortKey = "path" | "source" | "date";

/** A single quarantined item — a directly-selected target or something inside one. */
interface Target {
  path: string;
  title: string;
  quarantineData: string | null;
  /** Directly selected (sorts to top, gets a kind tag) vs. found inside a scan */
  isTopLevel: boolean;
  /** Directory/bundle — controls recursive "remove all" and the kind tag */
  isDir: boolean;
  kindLabel: string;
}

/** The result of scanning one or more selected paths, flattened for multi-select. */
interface ScanGroup {
  /** The originally selected paths, used to re-scan after an action */
  sources: string[];
  targets: Target[];
  scannedCount: number;
  /** Short label for the navigation title (a name, or "N items") */
  label: string;
  /** Context line for the section header, e.g. "app · recursive scan" */
  contextNote: string;
  multiSource: boolean;
}

/**
 * Scans every selected path and flattens the quarantined items into one list.
 * Directories/apps are scanned (apps recursively); plain files contribute a
 * single target when quarantined. Pure so it stays easy to reason about/test.
 */
function buildGroup(paths: string[]): ScanGroup {
  const multiSource = paths.length > 1;
  const targets: Target[] = [];
  let scannedCount = 0;
  let contextNote = multiSource ? `across ${paths.length} selected items` : "";

  for (const p of paths) {
    if (isDirectory(p)) {
      const scan = scanDirectory(p);
      scannedCount += scan.scannedCount;
      if (!multiSource) {
        contextNote = scan.isApp
          ? "app · recursive scan"
          : "folder · immediate contents only";
      }
      if (scan.rootQuarantineData) {
        targets.push({
          path: scan.path,
          title: multiSource ? scan.name : `${scan.name} (itself)`,
          quarantineData: scan.rootQuarantineData,
          isTopLevel: true,
          isDir: true,
          kindLabel: scan.isApp ? "App" : "Folder",
        });
      }
      for (const entry of scan.entries) {
        targets.push({
          path: entry.path,
          title: multiSource
            ? `${scan.name} › ${entry.relativePath}`
            : entry.relativePath,
          quarantineData: entry.quarantineData,
          isTopLevel: false,
          isDir: isDirectory(entry.path),
          kindLabel: "File",
        });
      }
    } else {
      scannedCount += 1;
      const status = getQuarantineStatus(p);
      if (status.hasQuarantine) {
        targets.push({
          path: status.path,
          title: status.name,
          quarantineData: status.quarantineData,
          isTopLevel: true,
          isDir: false,
          kindLabel: status.isApp ? "App" : "File",
        });
      }
    }
  }

  return {
    sources: paths,
    targets,
    scannedCount,
    label: paths.length === 1 ? getFileName(paths[0]) : `${paths.length} items`,
    contextNote,
    multiSource,
  };
}

/** Restores the last picked paths from storage (empty if none/invalid). */
async function readLastSelection(): Promise<string[]> {
  try {
    const raw = await LocalStorage.getItem<string>(LAST_SELECTION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const strings = Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string")
      : [];
    // Drop paths that have since moved/been deleted (mirrors getFinderSelections)
    // so ghost paths never reach the picker default or "Re-scan Last Selection".
    return existingPaths(strings);
  } catch {
    return [];
  }
}

// ─── Detail view (inspecting a single attribute) ────────────────────────────

function buildQuarantineMarkdown(attr: XattrInfo): string {
  const parsed = parseQuarantineData(attr.value);

  let md = `# 🔒 com.apple.quarantine\n\n`;

  if (parsed) {
    md += `## Download Info\n\n`;
    md += `| | |\n|---|---|\n`;
    md += `| **Source** | ${parsed.source} |\n`;
    md += `| **Date** | ${parsed.date} |\n`;
    md += `| **UUID** | \`${parsed.uuid || "—"}\` |\n`;
    md += `| **Flag Hex** | \`${parsed.rawFlags}\` |\n\n`;

    md += `## Active Flags\n\n`;
    for (const flag of parsed.flags) {
      md += `> ✦ **${flag}**\n\n`;
    }

    md += `---\n\n`;
  }

  md += `## Raw Attribute\n\n`;
  md += `\`\`\`\n${attr.value || "(empty)"}\n\`\`\`\n\n`;

  md += `---\n\n`;
  md += `> **What is this?** macOS attaches \`com.apple.quarantine\` to every file downloaded from the internet. `;
  md += `It triggers Gatekeeper on first launch. Use **Remove Quarantine** in the Actions menu once you've verified the file is from a trusted source.\n`;

  return md;
}

function buildGenericMarkdown(attr: XattrInfo): string {
  const isLongValue = attr.value.length > 120;
  const displayValue = attr.value || "(empty)";

  let md = `# \`${attr.name}\`\n\n`;

  if (attr.isDangerous) {
    md += `> ⚠️ This attribute contains metadata about the file's origin.\n\n`;
  }

  if (isLongValue) {
    const looksLikeHex = /^[0-9a-f\s]+$/i.test(attr.value.trim());
    if (looksLikeHex) {
      md += `## Value *(hex)*\n\n\`\`\`\n${attr.value}\n\`\`\`\n`;
    } else {
      md += `## Value\n\n\`\`\`\n${displayValue}\n\`\`\`\n`;
    }
  } else {
    md += `## Value\n\n`;
    md += `| Property | Data |\n|---|---|\n`;
    md += `| **Attribute** | \`${attr.name}\` |\n`;
    md += `| **Value** | \`${displayValue}\` |\n`;
    md += `| **Length** | ${attr.value.length} chars |\n`;
  }

  return md;
}

/** Wraps a raw com.apple.quarantine value as an XattrInfo for AttributeDetail. */
function entryToXattr(value: string): XattrInfo {
  return {
    name: "com.apple.quarantine",
    value,
    isQuarantine: true,
    isDangerous: true,
  };
}

function AttributeDetail({
  attr,
  filePath,
}: {
  attr: XattrInfo;
  filePath: string;
}) {
  const md = attr.isQuarantine
    ? buildQuarantineMarkdown(attr)
    : buildGenericMarkdown(attr);
  const parsed = attr.isQuarantine ? parseQuarantineData(attr.value) : null;

  const icon = attr.isQuarantine
    ? { source: Icon.Lock, tintColor: Color.Red }
    : attr.isDangerous
      ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
      : { source: Icon.Info, tintColor: Color.Blue };

  return (
    <Detail
      navigationTitle={attr.name}
      markdown={md}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Attribute"
            text={attr.name}
            icon={icon}
          />
          <Detail.Metadata.Label
            title="Type"
            text={
              attr.isQuarantine
                ? "Security (Quarantine)"
                : attr.isDangerous
                  ? "Origin Metadata"
                  : "Extended Attr"
            }
          />
          <Detail.Metadata.Separator />

          {parsed ? (
            <>
              <Detail.Metadata.Label title="Source App" text={parsed.source} />
              <Detail.Metadata.Label title="Download Date" text={parsed.date} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Flags">
                {parsed.flags.map((f) => (
                  <Detail.Metadata.TagList.Item
                    key={f}
                    text={f}
                    color={Color.Red}
                  />
                ))}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
              {parsed.uuid ? (
                <Detail.Metadata.Label title="UUID" text={parsed.uuid} />
              ) : null}
              <Detail.Metadata.Label title="Flag Hex" text={parsed.rawFlags} />
            </>
          ) : (
            <Detail.Metadata.Label
              title="Value Length"
              text={`${attr.value.length} chars`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Value"
            content={attr.value}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Attribute Name"
            content={attr.name}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          {attr.isQuarantine && (
            <Action.CopyToClipboard
              title="Copy Remove Command"
              content={`xattr -dr com.apple.quarantine "${filePath}"`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// ─── Main command ───────────────────────────────────────────────────────────

export default function ManageQuarantine() {
  const [state, setState] = useState<State>({ type: "selecting" });
  // Set of selected target paths (multi-select removal).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("path");
  // Last picked paths, restored from storage so the picker can default to them.
  const [lastSelection, setLastSelection] = useState<string[]>([]);
  const didMount = useRef(false);

  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    void (async () => {
      const finder = getFinderSelections();
      if (finder.length > 0) {
        await loadFiles(finder);
        return;
      }
      const stored = await readLastSelection();
      setLastSelection(stored);
      setState({ type: "selecting" });
    })();
  }, []);

  function selectFile(forceDialog = false) {
    if (!forceDialog) {
      const finder = getFinderSelections();
      if (finder.length > 0) {
        void loadFiles(finder);
        return;
      }
    }
    setState({ type: "selecting" });
  }

  async function loadFiles(paths: string[]) {
    if (paths.length === 0) {
      setState({ type: "selecting" });
      return;
    }
    setState({ type: "loading" });
    const inspectingFile = paths.length === 1 && !isDirectory(paths[0]);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: inspectingFile
        ? "Reading attributes…"
        : "Scanning for quarantined files…",
    });
    try {
      // Best-effort persistence: keep in-memory and stored selection in sync,
      // but never let a storage failure abort the scan.
      try {
        await LocalStorage.setItem(LAST_SELECTION_KEY, JSON.stringify(paths));
        setLastSelection(paths);
      } catch {
        // ignore — last-selection memory is a convenience, not critical
      }

      if (inspectingFile) {
        const status = getQuarantineStatus(paths[0]);
        await toast.hide();
        setSelected(new Set());
        setState({ type: "ready", status });
        return;
      }

      const group = buildGroup(paths);
      await toast.hide();
      // Default to all quarantined targets selected (uninstaller behaviour).
      setSelected(new Set(group.targets.map((t) => t.path)));
      setState({ type: "ready-group", group });
    } catch (err) {
      await toast.hide();
      const message = err instanceof Error ? err.message : String(err);
      setState({ type: "error", message });
    }
  }

  // ─── Removal handlers ─────────────────────────────────────────────────────

  async function handleRemoveSelected(targets: Target[], sources: string[]) {
    const paths = targets
      .filter((t) => selected.has(t.path))
      .map((t) => t.path);
    if (paths.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Nothing selected",
        message: "Select at least one file first",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: "Remove Quarantine from Selected",
      message: `Clear the quarantine flag from ${paths.length} item${paths.length !== 1 ? "s" : ""}?\n\nThese files will open without a Gatekeeper prompt afterwards.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Removing quarantine from ${paths.length} item${paths.length !== 1 ? "s" : ""}…`,
    });
    const result = removeQuarantineFromPaths(paths);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Quarantine removed",
        message: result.usedAdmin
          ? `${paths.length} item${paths.length !== 1 ? "s" : ""} (required admin)`
          : `${paths.length} item${paths.length !== 1 ? "s" : ""}`,
      });
      void loadFiles(sources);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove quarantine",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveOne(target: Target, sources: string[]) {
    const confirmed = await confirmAlert({
      title: "Remove Quarantine",
      message: `Remove the quarantine flag from "${target.title}"?`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing quarantine…",
    });
    const result = removeQuarantineFromPaths([target.path]);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Quarantine removed",
        message: result.usedAdmin
          ? `${target.title} (required admin)`
          : target.title,
      });
      void loadFiles(sources);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove quarantine",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveQuarantineFile(status: QuarantineStatus) {
    const confirmed = await confirmAlert({
      title: "Remove Quarantine Attribute",
      message: `Remove the quarantine flag from "${status.name}"?\n\nThe app will open without a Gatekeeper prompt after this.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing quarantine…",
    });
    const result = removeQuarantine(status.path);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Quarantine removed",
        message: result.usedAdmin
          ? `${status.name} (required admin)`
          : status.name,
      });
      void loadFiles([status.path]);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove quarantine",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveAll(
    filePath: string,
    name: string,
    recursive: boolean,
    sources: string[],
  ) {
    const confirmed = await confirmAlert({
      title: recursive
        ? "Remove All Extended Attributes (Recursive)"
        : "Remove All Extended Attributes",
      message: `Remove ALL xattr data from "${name}"${recursive ? " and everything inside it" : ""}?\n\nThis clears quarantine, download source info, and any other extended attributes.`,
      primaryAction: {
        title: "Remove All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing attributes…",
    });
    const result = removeAllAttributes(filePath, recursive);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "All attributes removed",
        message: name,
      });
      void loadFiles(sources);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove attributes",
        message: result.error ?? "Unknown error",
      });
    }
  }

  // ─── Selection helpers ────────────────────────────────────────────────────

  function toggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function setAll(paths: string[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of paths) {
        if (on) next.add(p);
        else next.delete(p);
      }
      return next;
    });
  }

  // ─── Selecting state (no Finder selection) ────────────────────────────────

  if (state.type === "selecting") {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Scan Selection"
              icon={Icon.Eye}
              onSubmit={(values: { file: string[] }) => {
                if (values.file?.length) void loadFiles(values.file);
              }}
            />
            {lastSelection.length > 0 && (
              <Action
                title={`Re-scan Last Selection (${lastSelection.length})`}
                icon={Icon.Clock}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => void loadFiles(lastSelection)}
              />
            )}
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="file"
          title="Files, Apps, or Folders"
          allowMultipleSelection={true}
          canChooseDirectories={true}
          defaultValue={lastSelection}
        />
      </Form>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────

  if (state.type === "error") {
    return (
      <Detail
        markdown={`## ❌ Error\n\n${state.message}\n\nCheck that Raycast has Automation permission for Finder in **System Settings → Privacy & Security → Automation**.`}
        actions={
          <ActionPanel>
            <Action
              title="Try Again"
              icon={Icon.RotateClockwise}
              onAction={() => selectFile()}
            />
          </ActionPanel>
        }
      />
    );
  }

  // ─── Grouped scan state (multi-select list) ───────────────────────────────

  if (state.type === "ready-group") {
    return (
      <SelectionList
        group={state.group}
        selected={selected}
        sortKey={sortKey}
        onSortChange={setSortKey}
        onToggle={toggle}
        onSetAll={setAll}
        onRemoveSelected={handleRemoveSelected}
        onRemoveOne={handleRemoveOne}
        onRemoveAll={handleRemoveAll}
        onSelectDifferent={() => selectFile(true)}
      />
    );
  }

  // ─── Single-file / loading state ──────────────────────────────────────────

  const isLoading = state.type === "loading";
  const status = state.type === "ready" ? state.status : null;
  const quarantineAttrs =
    status?.allAttributes.filter((a) => a.isQuarantine) ?? [];
  const otherAttrs = status?.allAttributes.filter((a) => !a.isQuarantine) ?? [];

  const selectDifferentFile: Action.Props = {
    title: "Select Different File",
    icon: Icon.Folder,
    shortcut: { modifiers: ["cmd"], key: "o" },
    onAction: () => selectFile(true),
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter attributes…">
      {status && (
        <>
          <List.Section title="Summary">
            <List.Item
              title={status.name}
              subtitle={status.path}
              icon={
                status.hasQuarantine
                  ? { source: Icon.Lock, tintColor: Color.Red }
                  : { source: Icon.Checkmark, tintColor: Color.Green }
              }
              accessories={[
                {
                  tag: {
                    value: status.hasQuarantine ? "Quarantined" : "Clean",
                    color: status.hasQuarantine ? Color.Red : Color.Green,
                  },
                },
                {
                  text: `${status.allAttributes.length} attr${status.allAttributes.length !== 1 ? "s" : ""}`,
                },
              ]}
              actions={
                <ActionPanel>
                  {status.hasQuarantine && (
                    <Action
                      title="Remove Quarantine"
                      icon={{
                        source: Icon.LockUnlocked,
                        tintColor: Color.Green,
                      }}
                      onAction={() => handleRemoveQuarantineFile(status)}
                    />
                  )}
                  {status.allAttributes.length > 0 && (
                    <Action
                      title="Remove All Attributes"
                      icon={{ source: Icon.Trash, tintColor: Color.Orange }}
                      onAction={() =>
                        handleRemoveAll(status.path, status.name, false, [
                          status.path,
                        ])
                      }
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={status.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {status.hasQuarantine && (
                    <Action.CopyToClipboard
                      title="Copy Remove Command"
                      content={`xattr -dr com.apple.quarantine "${status.path}"`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    />
                  )}
                  <Action {...selectDifferentFile} />
                </ActionPanel>
              }
            />
          </List.Section>

          {quarantineAttrs.length > 0 && (
            <List.Section title="Quarantine">
              {quarantineAttrs.map((attr) => (
                <List.Item
                  key={attr.name}
                  title={attr.name}
                  subtitle={parseQuarantineFlags(attr.value)}
                  icon={{ source: Icon.Lock, tintColor: Color.Red }}
                  accessories={[
                    { tag: { value: "Security", color: Color.Red } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={
                          <AttributeDetail attr={attr} filePath={status.path} />
                        }
                      />
                      <Action
                        title="Remove Quarantine"
                        icon={{
                          source: Icon.LockUnlocked,
                          tintColor: Color.Green,
                        }}
                        onAction={() => handleRemoveQuarantineFile(status)}
                      />
                      <Action.CopyToClipboard
                        title="Copy Value"
                        content={attr.value}
                      />
                      <Action {...selectDifferentFile} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {otherAttrs.length > 0 && (
            <List.Section title="Other Extended Attributes">
              {otherAttrs.map((attr) => (
                <List.Item
                  key={attr.name}
                  title={attr.name}
                  subtitle={attr.value.slice(0, 80)}
                  icon={{
                    source: Icon.Info,
                    tintColor: attr.isDangerous ? Color.Orange : Color.Blue,
                  }}
                  accessories={[
                    {
                      tag: {
                        value: attr.isDangerous ? "Metadata" : "Other",
                        color: Color.SecondaryText,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={
                          <AttributeDetail attr={attr} filePath={status.path} />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Value"
                        content={attr.value}
                      />
                      <Action {...selectDifferentFile} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {status.allAttributes.length === 0 && (
            <List.Section title="Extended Attributes">
              <List.Item
                title="No extended attributes found"
                subtitle="This file is clean"
                icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                actions={
                  <ActionPanel>
                    <Action {...selectDifferentFile} />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

// ─── Directory multi-select list ────────────────────────────────────────────

function SelectionList({
  group,
  selected,
  sortKey,
  onSortChange,
  onToggle,
  onSetAll,
  onRemoveSelected,
  onRemoveOne,
  onRemoveAll,
  onSelectDifferent,
}: {
  group: ScanGroup;
  selected: Set<string>;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  onToggle: (path: string) => void;
  onSetAll: (paths: string[], on: boolean) => void;
  onRemoveSelected: (targets: Target[], sources: string[]) => void;
  onRemoveOne: (target: Target, sources: string[]) => void;
  onRemoveAll: (
    filePath: string,
    name: string,
    recursive: boolean,
    sources: string[],
  ) => void;
  onSelectDifferent: () => void;
}) {
  const targets = useMemo<Target[]>(
    () => sortTargets(group.targets, sortKey),
    [group, sortKey],
  );

  const allPaths = targets.map((t) => t.path);
  const selectedCount = allPaths.filter((p) => selected.has(p)).length;
  const total = targets.length;

  if (total === 0) {
    return (
      <List searchBarPlaceholder="Filter quarantined items…">
        <List.EmptyView
          title={
            group.multiSource
              ? "No quarantine found in the selection"
              : `No quarantine found in ${group.label}`
          }
          description={cleanGroupSummary(group)}
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          actions={
            <ActionPanel>
              <Action
                title="Select Different File"
                icon={Icon.Folder}
                onAction={onSelectDifferent}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle={group.label}
      searchBarPlaceholder={`Filter quarantined items in ${group.label}…`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort by"
          value={sortKey}
          onChange={(v) => onSortChange(v as SortKey)}
        >
          <List.Dropdown.Item title="Sort by Path" value="path" />
          <List.Dropdown.Item title="Sort by Source" value="source" />
          <List.Dropdown.Item title="Sort by Date" value="date" />
        </List.Dropdown>
      }
    >
      <List.Section
        title={`${selectedCount} of ${total} selected · ${group.contextNote}`}
      >
        {targets.map((target) => {
          const isSelected = selected.has(target.path);
          const parsed = target.quarantineData
            ? parseQuarantineData(target.quarantineData)
            : null;
          return (
            <List.Item
              key={target.path}
              title={target.title}
              subtitle={
                parsed ? `${parsed.source} · ${parsed.date}` : undefined
              }
              icon={{ source: Icon.Lock, tintColor: Color.Red }}
              accessories={[
                ...(target.isTopLevel
                  ? [
                      {
                        tag: {
                          value: target.kindLabel,
                          color: Color.Orange,
                        },
                      },
                    ]
                  : []),
                {
                  icon: isSelected
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : Icon.Circle,
                  tooltip: isSelected ? "Selected" : "Not selected",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Remove Quarantine from Selected (${selectedCount})`}
                    icon={{ source: Icon.LockUnlocked, tintColor: Color.Green }}
                    onAction={() => onRemoveSelected(targets, group.sources)}
                  />
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => onToggle(target.path)}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Select All"
                      icon={Icon.CheckCircle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => onSetAll(allPaths, true)}
                    />
                    <Action
                      title="Deselect All"
                      icon={Icon.Circle}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                      onAction={() => onSetAll(allPaths, false)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      target={
                        <AttributeDetail
                          attr={entryToXattr(target.quarantineData ?? "")}
                          filePath={target.path}
                        />
                      }
                    />
                    <Action
                      title="Remove Quarantine from This File"
                      icon={{
                        source: Icon.LockUnlocked,
                        tintColor: Color.Green,
                      }}
                      onAction={() => onRemoveOne(target, group.sources)}
                    />
                    <Action
                      title={
                        target.isDir
                          ? "Remove All Attributes (recursive)"
                          : "Remove All Attributes"
                      }
                      icon={{ source: Icon.Trash, tintColor: Color.Orange }}
                      onAction={() =>
                        onRemoveAll(
                          target.path,
                          target.title,
                          target.isDir,
                          group.sources,
                        )
                      }
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={target.path}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Remove Command"
                      content={`xattr -d com.apple.quarantine "${target.path}"`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
                    />
                    <Action
                      title="Select Different File"
                      icon={Icon.Folder}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      onAction={onSelectDifferent}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** One-line scope summary shown when a scan finds nothing quarantined. */
function cleanGroupSummary(group: ScanGroup): string {
  const n = group.scannedCount;
  const items = `${n} item${n !== 1 ? "s" : ""}`;
  const scope = group.multiSource
    ? `${items} across ${group.sources.length} selected`
    : `${items} (${group.contextNote})`;
  return `Scanned ${scope} · 0 quarantined`;
}

function sortTargets(targets: Target[], key: SortKey): Target[] {
  const sorted = [...targets];
  sorted.sort((a, b) => {
    // Directly-selected items (apps/folders/files) always stay on top.
    if (a.isTopLevel !== b.isTopLevel) return a.isTopLevel ? -1 : 1;
    if (key === "path") {
      return a.title.localeCompare(b.title);
    }
    const pa = a.quarantineData ? parseQuarantineData(a.quarantineData) : null;
    const pb = b.quarantineData ? parseQuarantineData(b.quarantineData) : null;
    if (key === "source") {
      return (pa?.source ?? "").localeCompare(pb?.source ?? "");
    }
    // date — most recent first, compared on the numeric epoch (the display
    // string is locale-formatted and does not sort lexicographically).
    return (pb?.epoch ?? -Infinity) - (pa?.epoch ?? -Infinity);
  });
  return sorted;
}
