import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ComputeACLEntry } from "../types";
import { updateComputeACLEntries } from "../api";
import { FormValidation, useForm } from "@raycast/utils";
import { isValidPrefix, normalizePrefix } from "../utils/ip-validation";

interface ACLEntryFormProps {
  aclId: string;
  aclName: string;
  entry?: ComputeACLEntry;
  onSaved?: () => void;
}

export function ACLEntryForm({ aclId, aclName, entry, onSaved }: ACLEntryFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const isEditing = !!entry;

  const { handleSubmit, itemProps } = useForm<{ prefix: string; action: string }>({
    async onSubmit(values) {
      if (!isValidPrefix(values.prefix)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid IP address",
          message: "Enter a valid IPv4, IPv6, or CIDR notation (e.g. 192.168.1.0/24)",
        });
        return;
      }

      const prefix = normalizePrefix(values.prefix);
      const action = values.action as "ALLOW" | "BLOCK";

      try {
        setIsLoading(true);

        if (isEditing && entry.prefix !== prefix) {
          // Prefix changed: delete old, create new
          await updateComputeACLEntries(aclId, [
            { op: "delete", prefix: entry.prefix },
            { op: "create", prefix, action },
          ]);
        } else if (isEditing) {
          await updateComputeACLEntries(aclId, [{ op: "update", prefix, action }]);
        } else {
          await updateComputeACLEntries(aclId, [{ op: "create", prefix, action }]);
        }

        await showToast({
          style: Toast.Style.Success,
          title: isEditing ? "Entry updated" : "Entry added",
          message: `${prefix} → ${action} in ${aclName}`,
        });
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isEditing ? "Failed to update entry" : "Failed to add entry",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      prefix: entry?.prefix || "",
      action: entry?.action || "BLOCK",
    },
    validation: {
      prefix: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEditing ? `Edit Entry in ${aclName}` : `Add Entry to ${aclName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Entry" : "Add Entry"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`ACL: ${aclName}`} />
      <Form.TextField
        title="IP Address or CIDR"
        placeholder="e.g. 192.168.1.1 or 10.0.0.0/8 or 2001:db8::/32"
        info="Enter an IPv4/IPv6 address or CIDR block. Single IPs are automatically suffixed with /32 (IPv4) or /128 (IPv6)."
        {...itemProps.prefix}
      />
      <Form.Dropdown title="Action" {...itemProps.action}>
        <Form.Dropdown.Item value="BLOCK" title="Block" icon="🚫" />
        <Form.Dropdown.Item value="ALLOW" title="Allow" icon="✅" />
      </Form.Dropdown>
    </Form>
  );
}
