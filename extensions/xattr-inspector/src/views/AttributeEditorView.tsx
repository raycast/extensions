import { Action, ActionPanel, Alert, confirmAlert, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { AttributeKind } from "../models/XAttrEntry";
import { runCommand } from "../utils/command";
import { getSecurityWarning, KEY_PATTERN, MAX_KEY_BYTES, MAX_VALUE_BYTES } from "../utils/constants";
import { dateStringToBinaryPlist, xmlStringToBinaryPlist } from "../utils/xattrHelper";

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
  "com.apple.provenance",
  "com.apple.macl",
  "com.apple.rootless",
  "com.apple.lastuseddate",
  "com.apple.FinderInfo",
  "com.apple.TextEncoding",
  "com.apple.ResourceFork",
];

interface AttributeEditorViewProps {
  filePath: string;
  onComplete: () => void;
  initialKey?: string;
  initialValue?: string;
  kind?: AttributeKind;
}

export default function AttributeEditorView({
  filePath,
  onComplete,
  initialKey = "",
  initialValue = "",
  kind = "text",
}: AttributeEditorViewProps) {
  const navigation = useNavigation();
  const isEditing = !!initialKey;
  const [attributeKey, setAttributeKey] = useState(initialKey);

  const quarantineTemplate = useMemo(() => generateQuarantineValue(), []);
  const placeholderForKey = attributeKey === "com.apple.quarantine" ? quarantineTemplate : undefined;

  const handleSubmit = async (values: { key: string; customKey: string; value: string }) => {
    try {
      // Get the key from either the dropdown or custom text field
      const key = values.key && values.key !== "" ? values.key : values.customKey;
      let value = values.value;
      if (key === "com.apple.quarantine" && !value.trim()) {
        value = quarantineTemplate;
      }
      const keyBytes = Buffer.byteLength(key, "utf8");
      const valueBytes = Buffer.byteLength(value, "utf8");

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

      if (valueBytes > MAX_VALUE_BYTES) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Value too large",
          message: "Keep values under ~120 KB",
        });
        return;
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

      const isXml = value.trim().startsWith("<?xml");

      switch (kind) {
        case "binaryPlist": {
          const binary = await xmlStringToBinaryPlist(value);
          await runCommand("xattr", ["-wx", key, binary.toString("hex"), filePath]);
          break;
        }
        case "xmlPlist": {
          if (!isXml) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Invalid plist",
              message: "XML plist must start with <?xml",
            });
            return;
          }
          // Validate XML by converting, then keep as text
          await xmlStringToBinaryPlist(value);
          await runCommand("xattr", ["-w", key, value, filePath]);
          break;
        }
        case "plistDate": {
          const binary = await dateStringToBinaryPlist(value);
          await runCommand("xattr", ["-wx", key, binary.toString("hex"), filePath]);
          break;
        }
        default: {
          await runCommand("xattr", ["-w", key, value, filePath]);
        }
      }
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
      navigationTitle={filePath}
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

      {/* Only show the custom key field when we're editing OR the dropdown value is empty (Custom... selected) */}
      {(isEditing || attributeKey === "") && (
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
        info={
          attributeKey === "com.apple.quarantine"
            ? "Format: FLAG;TIMESTAMP;AGENT;UUID — flags: 0081 (downloaded), 0083 (opened). Leave empty to use the placeholder."
            : "Enter the value for this extended attribute"
        }
      />
    </Form>
  );
}
