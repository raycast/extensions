import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { JSX, useMemo, useState } from "react";
import { FileWithXattrs } from "../models/XAttrEntry";
import { getSecurityWarning } from "../utils/constants";
import { getAttributeDescription } from "../utils/knowledgeBase";
import { runCommand } from "../utils/command";
import { stripFlagFromAttribute } from "../utils/xattrHelper";
import AttributeEditorView from "./AttributeEditorView";
import AttributeFlagEditor from "./AttributeFlagEditor";

interface UnifiedAttributesListProps {
  files: FileWithXattrs[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function UnifiedAttributesList({ files, isLoading, onRefresh }: UnifiedAttributesListProps) {
  const allAttrs = useMemo(() => files.flatMap((file) => file.attributes.map((attr) => ({ file, attr }))), [files]);

  const [selectedId, setSelectedId] = useState<string>();
  const selected = allAttrs.find(({ file, attr }) => `${file.path}-${attr.name}` === selectedId);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      navigationTitle={selected ? selected.file.displayName : undefined}
      searchBarPlaceholder="Filter Attributes..."
    >
      {allAttrs.length === 0 && !isLoading ? (
        files.length > 0 ? (
          <List.EmptyView
            title="No Extended Attributes"
            description={`${files.length === 1 ? files[0].displayName : `${files.length} files`} — no xattrs found.`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add New Attribute"
                  icon={Icon.Plus}
                  target={<AttributeEditorView filePath={files[0].path} onComplete={onRefresh} />}
                />
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView title="No File Selected" description="Select a file in Finder to inspect xattrs." />
        )
      ) : (
        allAttrs.map(({ file, attr }) => {
          const id = `${file.path}-${attr.name}`;
          const desc = getAttributeDescription(attr.name) || "No description available.";

          const isQuarantine = attr.name === "com.apple.quarantine";
          const isWhereFrom = attr.name === "com.apple.metadata:kMDItemWhereFroms";

          const rawValue = attr.rawValue;
          const value = attr.value;
          const whereFromUrls = isWhereFrom
            ? value
                .split(/\r?\n/)
                .map((u) => u.trim())
                .filter(Boolean)
            : [];
          const trimmedValue = value.trim();
          const hasVal = trimmedValue !== "" && trimmedValue !== "\u0001\u0002";
          const hasPlistVal =
            trimmedValue.startsWith("<?xml") || rawValue.trimStart().startsWith("bplist") || value.startsWith("<?xml");
          const rawDisplay = attr.kind === "plistDate" ? (attr.editValue ?? rawValue) : rawValue;
          const sizeLabel = `${attr.sizeBytes.toLocaleString()} B`;
          const xmlContent = attr.binaryPlistXml ?? (hasPlistVal ? value : undefined);

          let metadataJSX: JSX.Element;

          if (isQuarantine) {
            const [flag, timestamp, application, uuid] = trimmedValue.split(";");
            metadataJSX = (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Attribute Name" text={attr.name} />
                <List.Item.Detail.Metadata.Label title="Size" text={sizeLabel} />
                <List.Item.Detail.Metadata.Separator />
                {flag && <List.Item.Detail.Metadata.Label title="Flag" text={flag.trim()} />}
                {timestamp && <List.Item.Detail.Metadata.Label title="Timestamp" text={timestamp.trim()} />}
                {application && <List.Item.Detail.Metadata.Label title="Agent" text={application.trim()} />}
                {uuid && <List.Item.Detail.Metadata.Label title="UUID" text={uuid.trim()} />}
              </List.Item.Detail.Metadata>
            );
          } else if (isWhereFrom) {
            metadataJSX = (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Attribute Name" text={attr.name} />
                <List.Item.Detail.Metadata.Label title="Size" text={sizeLabel} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.TagList title="Source">
                  {whereFromUrls.length === 0 ? (
                    <List.Item.Detail.Metadata.TagList.Item text="No Data" />
                  ) : (
                    whereFromUrls.map((url, i) => (
                      <List.Item.Detail.Metadata.TagList.Item key={`${url}-${i}`} text={url} />
                    ))
                  )}
                </List.Item.Detail.Metadata.TagList>
              </List.Item.Detail.Metadata>
            );
          } else {
            metadataJSX = (
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Attribute Name" text={attr.name} />
                <List.Item.Detail.Metadata.Label title="Size" text={sizeLabel} />
                {hasVal && <List.Item.Detail.Metadata.Separator />}
                {hasVal && <List.Item.Detail.Metadata.Label title="Value" text={trimmedValue} />}
                {rawDisplay !== value && <List.Item.Detail.Metadata.Label title="Raw Value" text={rawDisplay.trim()} />}
                {hasPlistVal && <List.Item.Detail.Metadata.Separator />}
                {hasPlistVal && (
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text="Property List" />
                  </List.Item.Detail.Metadata.TagList>
                )}
              </List.Item.Detail.Metadata>
            );
          }

          return (
            <List.Item
              key={id}
              id={id}
              title={attr.name}
              accessories={[{ text: sizeLabel }]}
              detail={<List.Item.Detail markdown={desc} metadata={metadataJSX} />}
              actions={
                <ActionPanel>
                  {(hasPlistVal || attr.kind === "binaryPlist" || attr.kind === "xmlPlist") && xmlContent && (
                    <ActionPanel.Section>
                      <Action.Push
                        title="View Xml"
                        icon={Icon.Code}
                        target={
                          <Detail
                            markdown={`                        
\`\`\`xml
${xmlContent}
\`\`\`
`}
                          />
                        }
                      />
                    </ActionPanel.Section>
                  )}

                  <Action.CopyToClipboard
                    title="Copy Value"
                    content={value}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Raw Value"
                    content={rawValue}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Attribute Name"
                    content={attr.name}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />

                  <ActionPanel.Section title="Flags">
                    <Action.Push
                      title="Add Flag Suffix"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "=" }}
                      target={
                        <AttributeFlagEditor filePath={file.path} attributeName={attr.name} onComplete={onRefresh} />
                      }
                    />
                    <Action
                      title="Strip Last Flag"
                      icon={Icon.Minus}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                      onAction={async () => {
                        if (
                          !(await confirmAlert({
                            title: "Strip Last Flag?",
                            message: `Rename "${attr.name}" by removing its last flag suffix.`,
                          }))
                        )
                          return;
                        try {
                          const newName = await stripFlagFromAttribute(file.path, attr.name);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Flag stripped",
                            message: `${attr.name} → ${newName}`,
                          });
                          onRefresh();
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to strip flag",
                            message: String(error),
                          });
                        }
                      }}
                    />
                  </ActionPanel.Section>

                  {isWhereFrom && whereFromUrls.length > 0 && (
                    <ActionPanel.Section title="Source URLs">
                      <Action.CopyToClipboard title="Copy All Urls" content={value} />
                      {whereFromUrls.map((url, i) => (
                        <Action.CopyToClipboard key={`${url}-${i}`} title="Copy URL" content={url} />
                      ))}
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Attribute Value"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      target={
                        <AttributeEditorView
                          filePath={file.path}
                          initialKey={attr.name}
                          initialValue={attr.editValue ?? attr.binaryPlistXml ?? (hasPlistVal ? value : attr.rawValue)}
                          kind={attr.kind}
                          onComplete={onRefresh}
                        />
                      }
                    />
                    <Action
                      title="Remove Attribute"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={async () => {
                        const warning = getSecurityWarning(attr.name);
                        const message = warning
                          ? `${warning.removeMessage}\n\nThis cannot be undone.`
                          : `Delete "${attr.name}" from ${file.displayName}. This cannot be undone.`;
                        if (
                          !(await confirmAlert({
                            title: warning ? `Remove ${attr.name}?` : "Remove Attribute?",
                            message,
                            primaryAction: warning
                              ? { title: "Remove Anyway", style: Alert.ActionStyle.Destructive }
                              : undefined,
                          }))
                        )
                          return;
                        try {
                          await runCommand("xattr", ["-d", attr.name, file.path]);
                          await showToast({
                            title: `'${attr.name}' removed`,
                            style: Toast.Style.Success,
                          });
                          onRefresh();
                        } catch (error) {
                          await showToast({
                            title: `Failed to remove ${attr.name}`,
                            message: String(error),
                            style: Toast.Style.Failure,
                          });
                        }
                      }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.Push
                      title="Add New Attribute"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      target={<AttributeEditorView filePath={file.path} onComplete={onRefresh} />}
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={onRefresh}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
