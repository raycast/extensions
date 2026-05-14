import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  getFinderSelection,
  getQuarantineStatus,
  parseQuarantineData,
  parseQuarantineFlags,
  QuarantineStatus,
  XattrInfo,
} from "./utils";

type State =
  | { type: "selecting" }
  | { type: "loading" }
  | { type: "ready"; status: QuarantineStatus }
  | { type: "error"; message: string };

function buildQuarantineMarkdown(attr: XattrInfo): string {
  const parsed = parseQuarantineData(attr.value);

  let md = `# 🔒 com.apple.quarantine\n\n`;

  if (parsed) {
    // ── Info grid ──────────────────────────────────────────────────────────
    md += `## Download Info\n\n`;
    md += `| | |\n|---|---|\n`;
    md += `| **Source** | ${parsed.source} |\n`;
    md += `| **Date** | ${parsed.date} |\n`;
    md += `| **UUID** | \`${parsed.uuid || "—"}\` |\n`;
    md += `| **Flag Hex** | \`${parsed.rawFlags}\` |\n\n`;

    // ── Flags as visual badges ─────────────────────────────────────────────
    md += `## Active Flags\n\n`;
    for (const flag of parsed.flags) {
      md += `> ✦ **${flag}**\n\n`;
    }

    md += `---\n\n`;
  }

  // ── Raw value ──────────────────────────────────────────────────────────
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
    // Try to detect and pretty-print hex/plist data
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

export default function CheckQuarantine() {
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
    setState({ type: "loading" });
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
        markdown={`## ❌ Error\n\n${state.message}`}
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
          {/* Summary */}
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
                  <Action.CopyToClipboard
                    title="Copy File Path"
                    content={status.path}
                  />
                  <Action {...selectDifferentFile} />
                </ActionPanel>
              }
            />
          </List.Section>

          {/* Quarantine attributes */}
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
                      <Action.CopyToClipboard
                        title="Copy Value"
                        content={attr.value}
                      />
                      <Action.CopyToClipboard
                        title="Copy Remove Command"
                        content={`xattr -dr com.apple.quarantine "${status.path}"`}
                      />
                      <Action {...selectDifferentFile} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {/* Other attributes */}
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

          {/* Empty state */}
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
