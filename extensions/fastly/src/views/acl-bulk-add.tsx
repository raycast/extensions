import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { updateComputeACLEntries } from "../api";
import { ComputeACLBulkEntry } from "../types";
import { FormValidation, useForm } from "@raycast/utils";

interface ACLBulkAddFormProps {
  aclId: string;
  aclName: string;
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

function parseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const slashIdx = trimmed.indexOf("/");
  if (slashIdx !== -1) {
    const ip = trimmed.slice(0, slashIdx);
    const subnet = parseInt(trimmed.slice(slashIdx + 1), 10);
    if (isNaN(subnet)) return null;
    if (isValidIPv4(ip) && subnet >= 0 && subnet <= 32) return trimmed;
    if (isValidIPv6(ip) && subnet >= 0 && subnet <= 128) return trimmed;
    return null;
  }

  if (isValidIPv4(trimmed)) return `${trimmed}/32`;
  if (isValidIPv6(trimmed)) return `${trimmed}/128`;
  return null;
}

export function ACLBulkAddForm({ aclId, aclName, onSaved }: ACLBulkAddFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<{ ips: string; action: string }>({
    async onSubmit(values) {
      const lines = values.ips.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
      const parsed: string[] = [];
      const invalid: string[] = [];

      for (const line of lines) {
        const result = parseLine(line);
        if (result) {
          parsed.push(result);
        } else {
          invalid.push(line.trim());
        }
      }

      if (invalid.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `${invalid.length} invalid IP${invalid.length === 1 ? "" : "s"}`,
          message: invalid.slice(0, 3).join(", ") + (invalid.length > 3 ? "..." : ""),
        });
        return;
      }

      if (parsed.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No valid IPs",
          message: "Enter at least one IP address or CIDR block.",
        });
        return;
      }

      try {
        setIsLoading(true);
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: `Adding ${parsed.length} entries...`,
        });

        const action = values.action as "ALLOW" | "BLOCK";
        const entries: ComputeACLBulkEntry[] = parsed.map((prefix) => ({
          op: "create" as const,
          prefix,
          action,
        }));

        await updateComputeACLEntries(aclId, entries);

        toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Entries added",
          message: `${parsed.length} IP${parsed.length === 1 ? "" : "s"} added to ${aclName}`,
        });
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add entries",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      ips: "",
      action: "BLOCK",
    },
    validation: {
      ips: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Bulk Add to ${aclName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add All Entries" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`ACL: ${aclName}`} />
      <Form.TextArea
        title="IP Addresses"
        placeholder={"192.168.1.1\n10.0.0.0/8\n2001:db8::/32\n# Lines starting with # are ignored"}
        info="One IP or CIDR per line. Lines starting with # are skipped. Single IPs are automatically suffixed with /32 or /128."
        {...itemProps.ips}
      />
      <Form.Dropdown title="Action" {...itemProps.action}>
        <Form.Dropdown.Item value="BLOCK" title="Block" icon="🚫" />
        <Form.Dropdown.Item value="ALLOW" title="Allow" icon="✅" />
      </Form.Dropdown>
    </Form>
  );
}
