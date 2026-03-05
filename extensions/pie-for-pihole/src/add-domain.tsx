import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";

export default function AddDomain() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: { domains: string; list: string; kind: string }) {
    const domains = values.domains
      .split(/[,\n]+/)
      .map((d) => d.trim())
      .filter(Boolean);

    if (domains.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No domains provided",
      });
      return;
    }

    setIsSubmitting(true);
    const list = values.list as "allow" | "deny";
    const kind = values.kind as "exact" | "regex";
    const listName = list === "deny" ? "blocklist" : "allowlist";

    await showToast({
      style: Toast.Style.Animated,
      title: `Adding ${domains.length} domain(s) to ${listName}...`,
    });

    try {
      const api = getPiholeAPI();
      const results = await Promise.allSettled(domains.map((domain) => api.addToList(domain, list, kind)));

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length === 0) {
        await showToast({
          style: Toast.Style.Success,
          title: `Added ${domains.length} domain(s) to ${listName}`,
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: `${failed.length} of ${domains.length} failed`,
          message: `${domains.length - failed.length} added successfully`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add domains",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Add Domain"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Domains" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="domains"
        title="Domains"
        placeholder={"example.com, ads.example.net\ntracker.example.org"}
        info="Enter domains separated by commas or newlines"
      />
      <Form.Dropdown id="list" title="List" defaultValue="deny">
        <Form.Dropdown.Item value="deny" title="Blocklist" />
        <Form.Dropdown.Item value="allow" title="Allowlist" />
      </Form.Dropdown>
      <Form.Dropdown id="kind" title="Kind" defaultValue="exact">
        <Form.Dropdown.Item value="exact" title="Exact" />
        <Form.Dropdown.Item value="regex" title="Regex" />
      </Form.Dropdown>
    </Form>
  );
}
