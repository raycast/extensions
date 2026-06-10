import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  DirectoryScan,
  getFinderSelection,
  getQuarantineStatus,
  isDirectory,
  parseQuarantineData,
  QuarantineStatus,
  removeAllAttributes,
  removeQuarantine,
  scanDirectory,
} from "./utils";

type State =
  | { type: "selecting" }
  | { type: "loading"; path: string }
  | { type: "ready"; status: QuarantineStatus }
  | { type: "ready-dir"; scan: DirectoryScan }
  | { type: "error"; message: string };

function buildMarkdown(status: QuarantineStatus): string {
  const statusIcon = status.hasQuarantine ? "🔒" : "✅";
  const statusText = status.hasQuarantine
    ? "**Quarantined**"
    : "**Clean** — no quarantine";

  let md = `# ${statusIcon} ${status.name}\n\n`;
  md += `| Property | Value |\n|---|---|\n`;
  md += `| Status | ${statusText} |\n`;
  md += `| Type | ${status.isApp ? "Application (.app)" : "File"} |\n`;
  md += `| Size | ${status.fileSize} |\n`;
  md += `| Modified | ${status.lastModified} |\n`;
  md += `| Path | \`${status.path}\` |\n\n`;

  if (status.hasQuarantine && status.quarantineData) {
    const parsed = parseQuarantineData(status.quarantineData);
    md += `## Quarantine Details\n\n`;
    if (parsed) {
      md += `| | |\n|---|---|\n`;
      md += `| **Source** | ${parsed.source} |\n`;
      md += `| **Downloaded** | ${parsed.date} |\n`;
      md += `| **UUID** | \`${parsed.uuid || "—"}\` |\n`;
      md += `| **Flag Hex** | \`${parsed.rawFlags}\` |\n\n`;
      md += `**Active flags**\n\n`;
      for (const flag of parsed.flags) {
        md += `> ✦ **${flag}**\n\n`;
      }
    } else {
      md += `\`\`\`\n${status.quarantineData}\n\`\`\`\n\n`;
    }
    md += `> macOS adds this attribute to files downloaded from the internet. `;
    md += `It triggers a Gatekeeper prompt on first launch. Developers and power users often remove it after verifying a file's source.\n\n`;
  }

  if (status.allAttributes.length > 0) {
    md += `## Extended Attributes (${status.allAttributes.length})\n\n`;
    for (const attr of status.allAttributes) {
      const tag = attr.isQuarantine ? " 🔒" : attr.isDangerous ? " ⚠️" : "";
      md += `### \`${attr.name}\`${tag}\n\`\`\`\n${attr.value || "(empty)"}\n\`\`\`\n\n`;
    }
  } else {
    md += `## Extended Attributes\n\n*None found — this file is clean.*\n`;
  }

  return md;
}

function buildDirMarkdown(scan: DirectoryScan): string {
  const kind = scan.isApp ? "Application bundle" : "Folder";
  const total = scan.entries.length + (scan.rootQuarantineData ? 1 : 0);
  const statusIcon = total > 0 ? "🔒" : "✅";
  const statusText =
    total > 0
      ? `**${total} quarantined item${total !== 1 ? "s" : ""}**`
      : "**Clean** — no quarantine";

  let md = `# ${statusIcon} ${scan.name}\n\n`;
  md += `| Property | Value |\n|---|---|\n`;
  md += `| Status | ${statusText} |\n`;
  md += `| Type | ${kind} |\n`;
  md += `| Scan | ${scan.scanMode === "recursive" ? "Recursive (entire bundle)" : "Immediate contents only"} |\n`;
  md += `| Modified | ${scan.lastModified} |\n`;
  md += `| Path | \`${scan.path}\` |\n\n`;

  if (scan.rootQuarantineData) {
    const parsed = parseQuarantineData(scan.rootQuarantineData);
    md += `## The ${scan.isApp ? "bundle" : "folder"} itself is quarantined\n\n`;
    if (parsed) {
      md += `> ✦ Source: **${parsed.source}** · ${parsed.date}\n\n`;
    }
  }

  if (scan.entries.length > 0) {
    md += `## Quarantined Files (${scan.entries.length})\n\n`;
    md += `| File | Source | Downloaded |\n|---|---|---|\n`;
    for (const entry of scan.entries) {
      const parsed = entry.quarantineData
        ? parseQuarantineData(entry.quarantineData)
        : null;
      md += `| \`${entry.relativePath}\` | ${parsed?.source ?? "—"} | ${parsed?.date ?? "—"} |\n`;
    }
    md += `\n`;
  } else if (!scan.rootQuarantineData) {
    md += `*No quarantined files found`;
    md +=
      scan.scanMode === "shallow"
        ? " in the immediate contents.*\n\n"
        : ".*\n\n";
  }

  if (total > 0) {
    md += `> Use **Remove Quarantine (Recursive)** to clear \`com.apple.quarantine\` from `;
    md += `${scan.isApp ? "the entire bundle" : "this folder and its contents"} at once.\n`;
  }

  return md;
}

export default function RemoveQuarantine() {
  const [state, setState] = useState<State>({ type: "selecting" });
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
    setState({ type: "loading", path: filePath });
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
        setState({ type: "ready-dir", scan });
      } else {
        const status = getQuarantineStatus(filePath);
        await toast.hide();
        setState({ type: "ready", status });
      }
    } catch (err) {
      await toast.hide();
      const message = err instanceof Error ? err.message : String(err);
      setState({ type: "error", message });
    }
  }

  async function handleRemoveQuarantine(status: QuarantineStatus) {
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

  async function handleRemoveAllAttributes(status: QuarantineStatus) {
    const confirmed = await confirmAlert({
      title: "Remove All Extended Attributes",
      message: `Remove all xattr data from "${status.name}"?\n\nThis clears quarantine, download source info, and any other extended attributes.`,
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
    const result = removeAllAttributes(status.path);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "All attributes removed",
        message: status.name,
      });
      void loadFile(status.path);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove attributes",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveQuarantineDir(scan: DirectoryScan) {
    const total = scan.entries.length + (scan.rootQuarantineData ? 1 : 0);
    const confirmed = await confirmAlert({
      title: "Remove Quarantine (Recursive)",
      message: `Remove the quarantine flag from ${total} item${total !== 1 ? "s" : ""} in "${scan.name}"?\n\nThis runs xattr -dr on ${scan.isApp ? "the entire bundle" : "this folder and its contents"}.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Removing quarantine…",
    });
    const result = removeQuarantine(scan.path);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "Quarantine removed",
        message: result.usedAdmin ? `${scan.name} (required admin)` : scan.name,
      });
      void loadFile(scan.path);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove quarantine",
        message: result.error ?? "Unknown error",
      });
    }
  }

  async function handleRemoveAllAttributesDir(scan: DirectoryScan) {
    const confirmed = await confirmAlert({
      title: "Remove All Extended Attributes (Recursive)",
      message: `Remove ALL xattr data from "${scan.name}" and everything inside it?\n\nThis clears quarantine, download source info, and any other extended attributes via xattr -cr.`,
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
    const result = removeAllAttributes(scan.path, true);
    await toast.hide();

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "All attributes removed",
        message: scan.name,
      });
      void loadFile(scan.path);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not remove attributes",
        message: result.error ?? "Unknown error",
      });
    }
  }

  // ─── Selecting state (no Finder selection) ───────────────────────────────

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
              onAction={selectFile}
            />
          </ActionPanel>
        }
      />
    );
  }

  // ─── Directory scan state ─────────────────────────────────────────────────

  if (state.type === "ready-dir") {
    const { scan } = state;
    const total = scan.entries.length + (scan.rootQuarantineData ? 1 : 0);
    return (
      <Detail
        markdown={buildDirMarkdown(scan)}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Quarantine Status"
              text={total > 0 ? `${total} quarantined` : "Clean"}
              icon={
                total > 0
                  ? { source: Icon.Lock, tintColor: Color.Red }
                  : { source: Icon.Checkmark, tintColor: Color.Green }
              }
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Name" text={scan.name} />
            <Detail.Metadata.Label
              title="Type"
              text={scan.isApp ? "Application" : "Folder"}
            />
            <Detail.Metadata.Label
              title="Scan"
              text={
                scan.scanMode === "recursive"
                  ? "Recursive"
                  : "Immediate contents"
              }
            />
            <Detail.Metadata.Label
              title="Quarantined Files"
              text={String(scan.entries.length)}
            />
            <Detail.Metadata.Label
              title="Last Modified"
              text={scan.lastModified}
            />
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            {total > 0 && (
              <Action
                title="Remove Quarantine (recursive)"
                icon={{ source: Icon.LockUnlocked, tintColor: Color.Green }}
                onAction={() => handleRemoveQuarantineDir(scan)}
              />
            )}
            {total > 0 && (
              <Action
                title="Remove All Attributes (recursive)"
                icon={{ source: Icon.Trash, tintColor: Color.Orange }}
                onAction={() => handleRemoveAllAttributesDir(scan)}
              />
            )}
            <Action
              title="Select Different File"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={() => selectFile(true)}
            />
            <Action.CopyToClipboard
              title="Copy Path"
              content={scan.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Recursive Remove Command"
              content={`xattr -dr com.apple.quarantine "${scan.path}"`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // ─── Loading / Ready state ────────────────────────────────────────────────

  const isLoading = state.type === "loading";
  const status = state.type === "ready" ? state.status : null;
  const md = status ? buildMarkdown(status) : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      metadata={
        status ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Quarantine Status"
              text={status.hasQuarantine ? "Quarantined" : "Clean"}
              icon={
                status.hasQuarantine
                  ? { source: Icon.Lock, tintColor: Color.Red }
                  : { source: Icon.Checkmark, tintColor: Color.Green }
              }
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="File Name" text={status.name} />
            <Detail.Metadata.Label title="File Size" text={status.fileSize} />
            <Detail.Metadata.Label
              title="Last Modified"
              text={status.lastModified}
            />
            <Detail.Metadata.Separator />
            {(() => {
              if (!status.hasQuarantine || !status.quarantineData) return null;
              const parsed = parseQuarantineData(status.quarantineData);
              if (!parsed) return null;
              return (
                <>
                  <Detail.Metadata.Label
                    title="Source App"
                    text={parsed.source}
                  />
                  <Detail.Metadata.Label
                    title="Download Date"
                    text={parsed.date}
                  />
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
                </>
              );
            })()}
            <Detail.Metadata.Label
              title="Extended Attributes"
              text={String(status.allAttributes.length)}
            />
            <Detail.Metadata.Label
              title="Type"
              text={status.isApp ? "Application" : "File"}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {status ? (
            <>
              {status.hasQuarantine ? (
                <>
                  <Action
                    title="Remove Quarantine"
                    icon={{ source: Icon.LockUnlocked, tintColor: Color.Green }}
                    onAction={() => handleRemoveQuarantine(status)}
                  />
                  {status.allAttributes.length > 1 && (
                    <Action
                      title="Remove All Attributes"
                      icon={{ source: Icon.Trash, tintColor: Color.Orange }}
                      onAction={() => handleRemoveAllAttributes(status)}
                    />
                  )}
                </>
              ) : (
                <Action
                  title="Check Another File"
                  icon={Icon.Folder}
                  onAction={() => selectFile(true)}
                />
              )}
              <Action
                title="Select Different File"
                icon={Icon.Folder}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
                onAction={() => selectFile(true)}
              />
              <Action.CopyToClipboard
                title="Copy File Path"
                content={status.path}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Xattr Command"
                content={`xattr -dr com.apple.quarantine "${status.path}"`}
                shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              />
            </>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
