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
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DirectoryScan,
  getFinderSelection,
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

type State =
  | { type: "selecting" }
  | { type: "loading" }
  | { type: "ready"; status: QuarantineStatus }
  | { type: "ready-dir"; scan: DirectoryScan }
  | { type: "error"; message: string };

type SortKey = "path" | "source" | "date";

/** A single quarantined target inside a directory scan (the root or a child). */
interface Target {
  path: string;
  title: string;
  quarantineData: string | null;
  isRoot: boolean;
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
  // Set of selected target paths (directory-scan multi-select).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("path");
  const didMount = useRef(false);

  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    selectFile();
  }, []);

  function selectFile(forceDialog = false) {
    if (!forceDialog) {
      const finderPath = getFinderSelection();
      if (finderPath) {
        void loadFile(finderPath);
        return;
      }
    }
    setState({ type: "selecting" });
  }

  async function loadFile(filePath: string) {
    setState({ type: "loading" });
    const scanningDir = isDirectory(filePath);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: scanningDir
        ? "Scanning for quarantined files…"
        : "Reading attributes…",
    });
    try {
      if (scanningDir) {
        const scan = scanDirectory(filePath);
        await toast.hide();
        // Default to all quarantined targets selected (uninstaller behaviour).
        const allPaths = [
          ...(scan.rootQuarantineData ? [scan.path] : []),
          ...scan.entries.map((e) => e.path),
        ];
        setSelected(new Set(allPaths));
        setState({ type: "ready-dir", scan });
      } else {
        const status = getQuarantineStatus(filePath);
        await toast.hide();
        setSelected(new Set());
        setState({ type: "ready", status });
      }
    } catch (err) {
      await toast.hide();
      const message = err instanceof Error ? err.message : String(err);
      setState({ type: "error", message });
    }
  }

  // ─── Removal handlers ─────────────────────────────────────────────────────

  async function handleRemoveSelected(targets: Target[], scanPath: string) {
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
      void loadFile(scanPath);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove quarantine",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveOne(target: Target, scanPath: string) {
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
      void loadFile(scanPath);
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
      void loadFile(status.path);
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
      void loadFile(filePath);
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
              title="Inspect File"
              icon={Icon.Eye}
              onSubmit={(values: { file: string[] }) => {
                if (values.file?.[0]) void loadFile(values.file[0]);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.FilePicker
          id="file"
          title="File or App"
          allowMultipleSelection={false}
          canChooseDirectories={true}
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

  // ─── Directory scan state (multi-select list) ─────────────────────────────

  if (state.type === "ready-dir") {
    return (
      <DirectoryList
        scan={state.scan}
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
                        handleRemoveAll(status.path, status.name, false)
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

function DirectoryList({
  scan,
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
  scan: DirectoryScan;
  selected: Set<string>;
  sortKey: SortKey;
  onSortChange: (key: SortKey) => void;
  onToggle: (path: string) => void;
  onSetAll: (paths: string[], on: boolean) => void;
  onRemoveSelected: (targets: Target[], scanPath: string) => void;
  onRemoveOne: (target: Target, scanPath: string) => void;
  onRemoveAll: (filePath: string, name: string, recursive: boolean) => void;
  onSelectDifferent: () => void;
}) {
  const kind = scan.isApp ? "app" : "folder";
  const scopeNote =
    scan.scanMode === "recursive"
      ? "recursive scan"
      : "immediate contents only";

  // Flatten the root (if quarantined) + child entries into one target list.
  const targets = useMemo<Target[]>(() => {
    const list: Target[] = [];
    if (scan.rootQuarantineData) {
      list.push({
        path: scan.path,
        title: `${scan.name} (itself)`,
        quarantineData: scan.rootQuarantineData,
        isRoot: true,
      });
    }
    for (const entry of scan.entries) {
      list.push({
        path: entry.path,
        title: entry.relativePath,
        quarantineData: entry.quarantineData,
        isRoot: false,
      });
    }
    return sortTargets(list, sortKey);
  }, [scan, sortKey]);

  const allPaths = targets.map((t) => t.path);
  const selectedCount = allPaths.filter((p) => selected.has(p)).length;
  const total = targets.length;

  if (total === 0) {
    return (
      <List searchBarPlaceholder="Filter quarantined items…">
        <List.EmptyView
          title={`No quarantine found in this ${kind}`}
          description={cleanScanSummary(scan)}
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
      navigationTitle={scan.name}
      searchBarPlaceholder={`Filter quarantined items in ${scan.name}…`}
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
        title={`${selectedCount} of ${total} selected · ${kind} · ${scopeNote}`}
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
                ...(target.isRoot
                  ? [
                      {
                        tag: {
                          value: scan.isApp ? "Bundle" : "Folder",
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
                    onAction={() => onRemoveSelected(targets, scan.path)}
                  />
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.Circle : Icon.CheckCircle}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
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
                      onAction={() => onRemoveOne(target, scan.path)}
                    />
                    <Action
                      title={
                        target.isRoot
                          ? "Remove All Attributes (recursive)"
                          : "Remove All Attributes"
                      }
                      icon={{ source: Icon.Trash, tintColor: Color.Orange }}
                      onAction={() =>
                        onRemoveAll(target.path, target.title, target.isRoot)
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

/** One-line scope summary shown when a directory scan finds nothing quarantined. */
function cleanScanSummary(scan: DirectoryScan): string {
  const n = scan.scannedCount;
  const items = `${n} item${n !== 1 ? "s" : ""}`;
  const scope =
    scan.scanMode === "shallow"
      ? `${items} (immediate contents only)`
      : `${items} in the bundle`;
  return `Scanned ${scope} · 0 quarantined`;
}

function sortTargets(targets: Target[], key: SortKey): Target[] {
  const sorted = [...targets];
  sorted.sort((a, b) => {
    // The directory/bundle itself always stays on top.
    if (a.isRoot !== b.isRoot) return a.isRoot ? -1 : 1;
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
