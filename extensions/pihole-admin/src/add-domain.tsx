// @ts-nocheck
import React from "react";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { piHoleAPI } from "./lib/api";

interface FormValues {
  domain: string;
  listType: "whitelist" | "blacklist";
  comment?: string;
}

export default function AddDomain() {
  const { pop } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    if (!values.domain.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Domain cannot be empty",
      });
      return;
    }

    // Validate basic domain format
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    if (!domainRegex.test(values.domain.trim())) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Invalid domain format",
      });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding domain...",
        message: `Adding ${values.domain} to ${values.listType === "whitelist" ? "allowlist" : "blocklist"}`,
      });

      if (values.listType === "whitelist") {
        await piHoleAPI.addToWhitelist(values.domain.trim());
      } else {
        await piHoleAPI.addToBlacklist(values.domain.trim());
      }

      await showToast({
        style: Toast.Style.Success,
        title: "✅ Domain Added",
        message: `${values.domain} was added to ${values.listType === "whitelist" ? "allowlist" : "blocklist"}`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error",
        message: error instanceof Error ? error.message : "Unknown error adding domain",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Domain" icon="plus" onSubmit={handleSubmit} />
          <Action title="Cancel" icon="xmark" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        info="Enter the domain you want to add (without http:// or https://)"
        autoFocus
      />

      <Form.Dropdown
        id="listType"
        title="List Type"
        defaultValue="blacklist"
        info="Select whether you want to allow or block this domain"
      >
        <Form.Dropdown.Item value="blacklist" title="🔴 Blocklist (Block)" icon="minus.circle" />
        <Form.Dropdown.Item value="whitelist" title="🟢 Allowlist (Allow)" icon="plus.circle" />
      </Form.Dropdown>

      <Form.TextArea
        id="comment"
        title="Comment (Optional)"
        placeholder="Reason for adding this domain..."
        info="Optional description to remember why you added this domain"
      />

      <Form.Separator />

      <Form.Description
        title="Information"
        text="• Allowlist: Domain will always be allowed, even if it's on a blocklist
• Blocklist: Domain will be blocked for all clients
• Changes may take a few seconds to apply"
      />
    </Form>
  );
}
