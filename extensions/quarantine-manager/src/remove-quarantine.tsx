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
  getFinderSelection,
  getQuarantineStatus,
  parseQuarantineData,
  QuarantineStatus,
  removeAllAttributes,
  removeQuarantine,
} from "./utils";

type State =
  | { type: "selecting" }
  | { type: "loading"; path: string }
  | { type: "ready"; status: QuarantineStatus }
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
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading attributes…",
    });
    try {
      const status = getQuarantineStatus(filePath);
      await toast.hide();
      setState({ type: "ready", status });
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
