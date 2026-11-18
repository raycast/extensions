import { useState, useEffect } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, Icon, getPreferenceValues, open, Color } from "@raycast/api";
import {
  getCustomerAttributes,
  getCustomerSegments,
  getCustomerMessages,
  CustomerProfile,
  Segment,
  CustomerMessage,
} from "./api";
import { formatRelativeTime } from "./utils/format-date";

interface CustomerDetailProps {
  id: string;
  idType?: "id" | "cio_id" | "email";
}

function getDisplayName(customer: CustomerProfile): string {
  const attrs = customer.attributes || {};
  const firstName = attrs.first_name || attrs.firstName || attrs.prenom || "";
  const lastName = attrs.last_name || attrs.lastName || attrs.nom || "";

  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return customer.email || customer.id;
}

function buildMarkdown(customer: CustomerProfile, segments: Segment[], messages: CustomerMessage[]): string {
  const displayName = getDisplayName(customer);
  let md = `# ${displayName}\n\n`;

  // Attributes table
  md += `### Attributes\n\n`;
  const attrs = customer.attributes || {};
  const attrKeys = Object.keys(attrs).filter((k) => !k.startsWith("_"));

  if (attrKeys.length > 0) {
    md += `| Attribute | Value |\n`;
    md += `|-----------|-------|\n`;
    attrKeys.slice(0, 20).forEach((key) => {
      const value = attrs[key];
      const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value ?? "-");
      md += `| ${key} | ${displayValue.substring(0, 50)}${displayValue.length > 50 ? "..." : ""} |\n`;
    });
    if (attrKeys.length > 20) {
      md += `\n_Showing 20 of ${attrKeys.length} attributes..._\n`;
    }
  } else {
    md += `_No custom attributes_\n`;
  }

  md += `\n---\n\n`;

  // Recent messages
  if (messages.length > 0) {
    md += `### Recent Messages\n\n`;
    md += `| Name / Subject | Type | Sent |\n`;
    md += `|----------------|------|------|\n`;
    messages.slice(0, 10).forEach((m) => {
      // For non-email types (like broadcasts), prefer broadcast name over subject
      const displayName = m.name || m.subject || "-";
      // API returns 'created', fallback to 'created_at' for compatibility
      const timestamp = m.created ?? m.created_at;
      md += `| ${displayName} | ${m.type} | ${formatRelativeTime(timestamp)} |\n`;
    });
    if (messages.length > 10) {
      md += `\n_Showing 10 of ${messages.length} messages..._\n`;
    }
  }

  return md;
}

export default function CustomerDetail({ id, idType = "id" }: CustomerDetailProps) {
  const preferences = getPreferenceValues<{ workspace_id?: string }>();
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getCustomerAttributes(id, idType),
      getCustomerSegments(id, idType).catch(() => []),
      getCustomerMessages(id, idType, 20).catch(() => []),
    ])
      .then(([customerData, segmentsData, messagesData]) => {
        setCustomer(customerData);
        setSegments(segmentsData);
        setMessages(messagesData);
      })
      .catch((error) => {
        showToast({ title: "Error loading customer", message: error.message, style: Toast.Style.Failure });
      })
      .finally(() => setLoading(false));
  }, [id, idType]);

  const metadata = customer ? (
    <Detail.Metadata>
      <Detail.Metadata.Label title="ID" text={customer.id} />
      {customer.cio_id && <Detail.Metadata.Label title="CIO ID" text={customer.cio_id} />}
      {customer.email && <Detail.Metadata.Label title="Email" text={customer.email} />}
      <Detail.Metadata.Separator />
      {customer.unsubscribed !== undefined && (
        <Detail.Metadata.TagList title="Subscription">
          <Detail.Metadata.TagList.Item
            text={customer.unsubscribed ? "Unsubscribed" : "Subscribed"}
            color={customer.unsubscribed ? Color.Red : Color.Green}
          />
        </Detail.Metadata.TagList>
      )}
      <Detail.Metadata.Label title="Created" text={formatRelativeTime(customer.created_at)} />
      {segments.length > 0 && (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title={`Segments (${segments.length})`}>
            {segments.slice(0, 5).map((s) => (
              <Detail.Metadata.TagList.Item key={s.id} text={s.name} />
            ))}
          </Detail.Metadata.TagList>
        </>
      )}
    </Detail.Metadata>
  ) : undefined;

  const markdown = customer ? buildMarkdown(customer, segments, messages) : "Loading...";

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      metadata={metadata}
      actions={
        customer ? (
          <ActionPanel>
            <Action
              title="Open in Customer.io"
              icon={Icon.Globe}
              onAction={() => {
                if (!preferences.workspace_id) {
                  showToast({
                    title: "Workspace ID not configured",
                    message: "Please set your Workspace ID in Raycast extension preferences",
                    style: Toast.Style.Failure,
                  });
                  return;
                }
                const url = `https://fly.customer.io/workspaces/${preferences.workspace_id}/people/${customer.id}`;
                open(url);
              }}
            />
            {customer.email && (
              <Action.CopyToClipboard
                title="Copy Email"
                content={customer.email}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action.CopyToClipboard title="Copy Customer ID" content={customer.id} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
