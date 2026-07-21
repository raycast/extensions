import { Action, ActionPanel, Alert, confirmAlert, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { AttributeKind } from "../models/XAttrEntry";
import { assertAttributeWritable, prepareAttributeWrite, writePreparedAttribute } from "../utils/attributeWrite";
import {
  getSecurityWarning,
  isPlistDateAttribute,
  isReadOnlyBinaryAttribute,
  KEY_PATTERN,
  MAX_KEY_BYTES,
  MAX_VALUE_BYTES,
} from "../utils/constants";
import { attributeExists } from "../utils/xattrHelper";

function generateQuarantineValue(): string {
  const macEpoch = new Date("2001-01-01T00:00:00Z").getTime();
  const hexTimestamp = Math.floor((Date.now() - macEpoch) / 1000)
    .toString(16)
    .toUpperCase();
  return `0083;${hexTimestamp};unknown;`;
}

const COMMON_ATTRIBUTES = [
  "com.apple.metadata:kMDItemWhereFroms",
  "com.apple.metadata:kMDItemDownloadedDate",
  "com.apple.metadata:_kMDItemUserTags",
  "com.apple.metadata:kMDItemFinderComment",
  "com.apple.metadata:kMDItemDescription",
  "com.apple.metadata:kMDItemCopyright",
  "com.apple.metadata:kMDItemCreator",
  "com.apple.metadata:kMDItemHeadline",
  "com.apple.metadata:com_apple_backup_excludeItem",
  "com.apple.quarantine",
  "com.apple.lastuseddate#PS",
  "com.apple.TextEncoding",
];

interface AttributeEditorViewProps {
  filePath: string;
  displayName?: string;
  onComplete: () => void;
  initialKey?: string;
  initialValue?: string;
  kind?: AttributeKind;
}

export default function AttributeEditorView({
  filePath,
  displayName,
  onComplete,
  initialKey = "",
  initialValue = "",
  kind = "text",
}: AttributeEditorViewProps) {
  const navigation = useNavigation();
  const isEditing = !!initialKey;
  const [attributeKey, setAttributeKey] = useState(initialKey);

  const quarantineTemplate = useMemo(() => generateQuarantineValue(), []);
  const activeKey = isEditing ? initialKey : attributeKey;
  const placeholderForKey =
    activeKey === "com.apple.quarantine"
      ? quarantineTemplate
      : activeKey === "com.apple.metadata:kMDItemWhereFroms"
        ? "https://example.com/download\nhttps://example.com/source"
        : activeKey === "com.apple.metadata:_kMDItemUserTags"
          ? "Tag Name"
          : undefined;

  const valueInfo =
    activeKey === "com.apple.quarantine"
      ? "Format: FLAG;TIMESTAMP;AGENT;UUID - flags: 0081 (downloaded), 0083 (opened). Leave empty to use the placeholder."
      : activeKey === "com.apple.metadata:kMDItemWhereFroms"
        ? "Enter one source URL per line. The value will be written as a binary plist array."
        : activeKey === "com.apple.metadata:_kMDItemUserTags"
          ? "Enter one Finder tag per line. Plain tags are written with Finder color suffix 0."
          : isPlistDateAttribute(activeKey)
            ? "Enter a date parseable by macOS, for example 2026-07-20T12:00:00Z."
            : "Enter the value for this extended attribute";

  const handleSubmit = async (values: { key: string; customKey: string; value: string }) => {
    try {
      const key = isEditing ? initialKey : values.key && values.key !== "" ? values.key : values.customKey;
      let value = values.value;
      if (key === "com.apple.quarantine" && !value.trim()) {
        value = quarantineTemplate;
      }
      const keyBytes = Buffer.byteLength(key, "utf8");

      if (!key.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Key is required",
          message: "Please enter a valid attribute key",
        });
        return;
      }

      if (keyBytes > MAX_KEY_BYTES || !KEY_PATTERN.test(key)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid key",
          message: "Use up to 255 ASCII letters/digits/._-:",
        });
        return;
      }

      if (isReadOnlyBinaryAttribute(key)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Read-only attribute",
          message: "This system/binary attribute is unsafe to edit from this form",
        });
        return;
      }

      assertAttributeWritable(key);
      const prepared = await prepareAttributeWrite(key, value, kind, !isEditing);

      if (prepared.sizeBytes > MAX_VALUE_BYTES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Value too large",
          message: "Keep values under ~120 KB",
        });
        return;
      }

      if (!isEditing && (await attributeExists(filePath, key))) {
        const confirmed = await confirmAlert({
          title: `Overwrite ${key}?`,
          message: "This file already has an attribute with that key. Overwriting replaces its current value.",
          primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      const warning = getSecurityWarning(key);
      if (warning) {
        const confirmed = await confirmAlert({
          title: `${isEditing ? "Edit" : "Set"} ${key}?`,
          message: warning.editMessage,
          primaryAction: { title: isEditing ? "Edit Anyway" : "Set Anyway", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      await writePreparedAttribute(filePath, key, prepared);
      await showToast({
        style: Toast.Style.Success,
        title: `Attribute "${key}" ${isEditing ? "updated" : "added"} successfully`,
      });

      // Notify parent component to refresh the list
      onComplete();
      navigation.pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEditing ? "Failed to update attribute" : "Failed to add attribute",
        message: String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle={displayName ?? filePath}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Attribute" : "Add Attribute"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {!isEditing && (
        <Form.Dropdown id="key" title="Attribute Key" value={attributeKey} onChange={setAttributeKey}>
          <Form.Dropdown.Item value="" title="Custom..." />
          {COMMON_ATTRIBUTES.map((attr) => (
            <Form.Dropdown.Item key={attr} value={attr} title={attr} />
          ))}
        </Form.Dropdown>
      )}

      {isEditing && <Form.Description title="Attribute Key" text={initialKey} />}

      {!isEditing && attributeKey === "" && (
        <Form.TextField
          id="customKey"
          title="Custom Key"
          placeholder="Enter attribute key"
          defaultValue={initialKey}
          info="Enter the xattr key (e.g. com.apple.quarantine)"
        />
      )}

      <Form.TextArea
        id="value"
        title="Value"
        placeholder={placeholderForKey ?? "Enter attribute value"}
        defaultValue={initialValue}
        info={valueInfo}
      />
    </Form>
  );
}
