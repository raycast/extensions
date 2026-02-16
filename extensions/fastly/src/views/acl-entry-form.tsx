import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ComputeACLEntry } from "../types";
import { updateComputeACLEntries } from "../api";
import { FormValidation, useForm } from "@raycast/utils";

interface ACLEntryFormProps {
  aclId: string;
  aclName: string;
  entry?: ComputeACLEntry;
  onSaved?: () => void;
}

function isValidIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const num = parseInt(p, 10);
    return !isNaN(num) && num >= 0 && num <= 255 && String(num) === p;
  });
}

function isValidIPv6(ip: string): boolean {
  if (ip.includes("::")) {
    const sides = ip.split("::");
    if (sides.length > 2) return false;
    const totalGroups = (sides[0] ? sides[0].split(":").length : 0) + (sides[1] ? sides[1].split(":").length : 0);
    if (totalGroups > 7) return false;
  } else {
    if (ip.split(":").length !== 8) return false;
  }
  return ip.split(":").every((g) => g === "" || /^[0-9a-fA-F]{1,4}$/.test(g));
}

function isValidPrefix(input: string): boolean {
  const trimmed = input.trim();
  const slashIdx = trimmed.indexOf("/");

  if (slashIdx === -1) {
    return isValidIPv4(trimmed) || isValidIPv6(trimmed);
  }

  const ip = trimmed.slice(0, slashIdx);
  const subnet = parseInt(trimmed.slice(slashIdx + 1), 10);
  if (isNaN(subnet)) return false;
  if (isValidIPv4(ip)) return subnet >= 0 && subnet <= 32;
  if (isValidIPv6(ip)) return subnet >= 0 && subnet <= 128;
  return false;
}

// Ensure a prefix always has a CIDR suffix (single IPs get /32 or /128)
function normalizePrefix(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes("/")) return trimmed;
  if (isValidIPv4(trimmed)) return `${trimmed}/32`;
  if (isValidIPv6(trimmed)) return `${trimmed}/128`;
  return trimmed;
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
