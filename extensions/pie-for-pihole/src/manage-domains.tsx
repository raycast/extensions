import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import type { DomainEntry } from "./api/types";

export function AddDomainForm({ onSuccess }: { onSuccess?: () => void } = {}) {
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
      onSuccess?.();
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

function sectionTitle(type: string, kind: string): string {
  const listLabel = type === "allow" ? "Allow" : "Deny";
  const kindLabel = kind === "regex" ? "Regex" : "Exact";
  return `${listLabel} (${kindLabel})`;
}

export default function ManageDomains() {
  const { push, pop } = useNavigation();

  const {
    isLoading,
    data: domains,
    mutate,
    revalidate,
  } = useCachedPromise(async () => {
    try {
      const api = getPiholeAPI();
      return await api.getDomains();
    } catch {
      return [] as DomainEntry[];
    }
  });

  async function handleDelete(entry: DomainEntry) {
    if (
      await confirmAlert({
        title: "Delete Domain",
        message: `Are you sure you want to delete "${entry.domain}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting domain...",
      });
      try {
        await mutate(getPiholeAPI().deleteDomain(entry.type, entry.kind, entry.domain), {
          optimisticUpdate(data) {
            return data?.filter((d) => d.id !== entry.id) ?? [];
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Domain deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete domain";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    }
  }

  const sections = [
    { type: "allow", kind: "exact" },
    { type: "allow", kind: "regex" },
    { type: "deny", kind: "exact" },
    { type: "deny", kind: "regex" },
  ];

  return (
    <List isLoading={isLoading} navigationTitle="Manage Domains" searchBarPlaceholder="Search domains">
      <List.EmptyView title="No domains configured" description="Press ⌘N to add a domain" />
      {sections.map(({ type, kind }) => {
        const items = domains?.filter((d) => d.type === type && d.kind === kind) ?? [];
        if (items.length === 0) return null;
        return (
          <List.Section key={`${type}-${kind}`} title={sectionTitle(type, kind)}>
            {items.map((entry) => (
              <List.Item
                key={entry.id ?? `${entry.type}-${entry.kind}-${entry.domain}`}
                title={entry.domain}
                accessories={[
                  {
                    tag: {
                      value: entry.enabled ? "enabled" : "disabled",
                      color: entry.enabled ? Color.Green : Color.SecondaryText,
                    },
                  },
                ]}
                actions={
                  <ActionPanel title="Actions">
                    <Action
                      title="Delete Domain"
                      icon={{ source: Icon.Trash, tintColor: Color.Red }}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(entry)}
                    />
                    <Action.CopyToClipboard title="Copy Domain" content={entry.domain} />
                    <Action
                      title="Add New Domain"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() =>
                        push(
                          <AddDomainForm
                            onSuccess={() => {
                              revalidate();
                              pop();
                            }}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
