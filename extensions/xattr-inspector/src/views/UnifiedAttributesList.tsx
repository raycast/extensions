import { Action, ActionPanel, Alert, confirmAlert, Detail, Icon, List, Toast, showToast } from "@raycast/api";
import { JSX, useMemo, useState } from "react";
import { FileWithXattrs } from "../models/XAttrEntry";
import { getSecurityWarning, isMDLabelAttribute, isReadOnlyBinaryAttribute } from "../utils/constants";
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
  const selectedEmptyFile = files.find((file) => selectedId === `${file.path}-__empty`);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      navigationTitle={selected?.file.displayName ?? selectedEmptyFile?.displayName}
      searchBarPlaceholder="Filter Attributes..."
    >
      {allAttrs.length === 0 && !isLoading ? (
        files.length > 0 ? (
          <List.EmptyView
            title="No Extended Attributes"
            description={`${files.length === 1 ? files[0].displayName : `${files.length} files`} — no xattrs found.`}
            actions={
              <ActionPanel>
                {files.length === 1 ? (
                  <Action.Push
                    title="Add New Attribute"
                    icon={Icon.Plus}
                    target={
                      <AttributeEditorView
                        filePath={files[0].path}
                        displayName={files[0].displayName}
                        onComplete={onRefresh}
                      />
                    }
                  />
                ) : (
                  <ActionPanel.Section title="Add Attribute To">
                    {files.map((file) => (
                      <Action.Push
                        key={file.path}
                        title={`Add to ${file.displayName}`}
                        icon={Icon.Plus}
                        target={
                          <AttributeEditorView
                            filePath={file.path}
                            displayName={file.displayName}
                            onComplete={onRefresh}
                          />
                        }
                      />
                    ))}
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ) : (
          <List.EmptyView title="No File Selected" description="Select a file in Finder to inspect xattrs." />
        )
      ) : (
        files.map((file) => (
          <List.Section key={file.path} title={file.displayName}>
            {file.attributes.length === 0 ? (
              <List.Item
                id={`${file.path}-__empty`}
                title="No Extended Attributes"
                accessories={[{ text: file.displayName }]}
                detail={<List.Item.Detail markdown="No extended attributes found for this file." />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Add New Attribute"
                      icon={Icon.Plus}
                      target={
                        <AttributeEditorView
                          filePath={file.path}
                          displayName={file.displayName}
                          onComplete={onRefresh}
                        />
                      }
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={onRefresh}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              file.attributes.map((attr) => {
                const id = `${file.path}-${attr.name}`;
                const desc = getAttributeDescription(attr.name) || "No description available.";

                const isQuarantine = attr.name === "com.apple.quarantine";
                const isMACL = attr.name === "com.apple.macl";
                const isWhereFrom = attr.name === "com.apple.metadata:kMDItemWhereFroms";
                const isMDLabel = isMDLabelAttribute(attr.name);

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
                  trimmedValue.startsWith("<?xml") ||
                  rawValue.trimStart().startsWith("bplist") ||
                  value.startsWith("<?xml");
                const hasPlistContent =
                  attr.kind === "binaryPlist" ||
                  attr.kind === "xmlPlist" ||
                  Boolean(attr.binaryPlistXml || attr.plistJson);
                const rawDisplay =
                  attr.kind === "binary"
                    ? (attr.editValue ?? attr.rawHex ?? rawValue)
                    : attr.kind === "plistDate"
                      ? (attr.editValue ?? rawValue)
                      : rawValue;
                const sizeLabel = `${attr.sizeBytes.toLocaleString()} B`;
                const jsonContent = attr.plistJson;
                const canEditAttribute =
                  !isReadOnlyBinaryAttribute(attr.name) && attr.plistSummary?.archiveType !== "NSKeyedArchiver";
                const canRenameAttribute = !isReadOnlyBinaryAttribute(attr.name);
                const detailMarkdown = desc;

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
                      {whereFromUrls.length === 0 ? (
                        <List.Item.Detail.Metadata.Label title="Source(s)" text="No Data" />
                      ) : (
                        whereFromUrls.map((url, i) => (
                          <List.Item.Detail.Metadata.Label
                            key={`${url}-${i}`}
                            title={i === 0 ? "Source(s)" : ""}
                            text={url}
                          />
                        ))
                      )}
                    </List.Item.Detail.Metadata>
                  );
                } else {
                  metadataJSX = (
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Attribute Name" text={attr.name} />
                      <List.Item.Detail.Metadata.Label title="Size" text={sizeLabel} />
                      {isMACL ? (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          {attr.maclRecords && attr.maclRecords.length > 0 ? (
                            attr.maclRecords.map((record, i) => (
                              <List.Item.Detail.Metadata.Label
                                key={`${record.header}-${record.appUUID}-${i}`}
                                title={i === 0 ? "Record(s)" : ""}
                                text={`${record.header} ${record.appUUID}`}
                              />
                            ))
                          ) : (
                            <List.Item.Detail.Metadata.Label title="Value" text="Opaque binary data" />
                          )}
                        </>
                      ) : isMDLabel ? (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Label ID"
                            text={attr.name.replace("com.apple.metadata:kMDLabel_", "")}
                          />
                          <List.Item.Detail.Metadata.Label title="Value" text="Opaque binary data" />
                        </>
                      ) : hasPlistContent ? (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.TagList title="Type">
                            <List.Item.Detail.Metadata.TagList.Item text="Property List" />
                          </List.Item.Detail.Metadata.TagList>
                          {attr.plistSummary?.rootType && (
                            <List.Item.Detail.Metadata.Label title="Root" text={attr.plistSummary.rootType} />
                          )}
                          {attr.plistSummary?.archiveType && (
                            <List.Item.Detail.Metadata.Label title="Archive" text={attr.plistSummary.archiveType} />
                          )}
                          {attr.plistSummary?.topLevelKeys && attr.plistSummary.topLevelKeys.length > 0 && (
                            <List.Item.Detail.Metadata.TagList title="Keys">
                              {attr.plistSummary.topLevelKeys.map((key) => (
                                <List.Item.Detail.Metadata.TagList.Item key={key} text={key} />
                              ))}
                            </List.Item.Detail.Metadata.TagList>
                          )}
                        </>
                      ) : (
                        <>
                          {hasVal && <List.Item.Detail.Metadata.Separator />}
                          {hasVal && <List.Item.Detail.Metadata.Label title="Value" text={trimmedValue} />}
                          {rawDisplay !== value && (
                            <List.Item.Detail.Metadata.Label title="Raw Value" text={rawDisplay.trim()} />
                          )}
                        </>
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
                    detail={<List.Item.Detail markdown={detailMarkdown} metadata={metadataJSX} />}
                    actions={
                      <ActionPanel>
                        {jsonContent && (
                          <ActionPanel.Section>
                            <Action.Push
                              title="View as JSON"
                              icon={Icon.Code}
                              target={
                                <Detail
                                  navigationTitle={file.displayName}
                                  markdown={`
\`\`\`json
${jsonContent}
\`\`\`
`}
                                />
                              }
                            />
                          </ActionPanel.Section>
                        )}

                        <Action.CopyToClipboard
                          title="Copy Value"
                          content={jsonContent ?? value}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title={attr.kind === "binary" ? "Copy Hex Value" : "Copy Raw Value"}
                          content={attr.kind === "binary" ? (attr.editValue ?? attr.rawHex ?? rawValue) : rawValue}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Attribute Name"
                          content={attr.name}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        />

                        {canRenameAttribute && (
                          <ActionPanel.Section title="Flags">
                            <Action.Push
                              title="Add Flag Suffix"
                              icon={Icon.Plus}
                              shortcut={{ modifiers: ["cmd", "shift"], key: "=" }}
                              target={
                                <AttributeFlagEditor
                                  filePath={file.path}
                                  displayName={file.displayName}
                                  attributeName={attr.name}
                                  onComplete={onRefresh}
                                />
                              }
                            />
                            <Action
                              title="Strip Last Flag"
                              icon={Icon.Minus}
                              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                              onAction={async () => {
                                const warning = getSecurityWarning(attr.name);
                                const suffix = attr.name.slice(attr.name.lastIndexOf("#") + 1);
                                const isSystemSuffix = ["P", "S", "PS"].includes(suffix);
                                const message = [
                                  `Rename "${attr.name}" by removing its last flag suffix.`,
                                  isSystemSuffix
                                    ? "This suffix is part of a macOS-recognized attribute name and stripping it can make the attribute stop working as system metadata."
                                    : undefined,
                                  warning?.editMessage,
                                ]
                                  .filter(Boolean)
                                  .join("\n\n");
                                if (
                                  !(await confirmAlert({
                                    title: "Strip Last Flag?",
                                    message,
                                    primaryAction:
                                      isSystemSuffix || warning
                                        ? { title: "Strip Anyway", style: Alert.ActionStyle.Destructive }
                                        : undefined,
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
                        )}

                        {isWhereFrom && whereFromUrls.length > 0 && (
                          <ActionPanel.Section title="Source URLs">
                            <Action.CopyToClipboard title="Copy Sources" content={value} />
                          </ActionPanel.Section>
                        )}

                        <ActionPanel.Section>
                          {canEditAttribute && (
                            <Action.Push
                              title="Edit Attribute Value"
                              icon={Icon.Pencil}
                              shortcut={{ modifiers: ["cmd"], key: "e" }}
                              target={
                                <AttributeEditorView
                                  filePath={file.path}
                                  displayName={file.displayName}
                                  initialKey={attr.name}
                                  initialValue={
                                    attr.kind === "binary"
                                      ? (attr.editValue ?? attr.rawHex ?? "")
                                      : (attr.editValue ?? attr.binaryPlistXml ?? (hasPlistVal ? value : attr.rawValue))
                                  }
                                  kind={attr.kind}
                                  onComplete={onRefresh}
                                />
                              }
                            />
                          )}
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
                            target={
                              <AttributeEditorView
                                filePath={file.path}
                                displayName={file.displayName}
                                onComplete={onRefresh}
                              />
                            }
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
          </List.Section>
        ))
      )}
    </List>
  );
}
