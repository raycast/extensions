import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useEffect } from "react";
import { ExpirationItem } from "../api/types";
import { formatDate, parseApiDate, relativeExpiry } from "../lib/dates";
import { expirationWebUrl } from "../lib/links";
import { track } from "../lib/telemetry";
import { AccountActions, OpenInWebAppAction } from "./actions";

function statusTagColor(item: ExpirationItem): Color {
  const date = parseApiDate(item.expiration_date);
  if (!date) return Color.SecondaryText;
  const status = (item.status ?? "").toLowerCase();
  if (status.includes("expired")) return Color.Red;
  if (status.includes("notif")) return Color.Orange;
  return Color.Green;
}

/** Shared detail view for an expiration item — markdown body + metadata sidebar. */
export function ExpirationDetail({ item }: { item: ExpirationItem }) {
  useEffect(() => {
    track({ name: "detail_viewed", entity_type: "expiration_item" });
  }, []);

  const date = parseApiDate(item.expiration_date);
  const categoryName = item.category?.name ?? item.category_name ?? "Generic";
  const contacts = item.contacts ?? [];

  const markdown = [
    `# ${item.name}`,
    "",
    `**${relativeExpiry(date)}**`,
    "",
    item.details ? `## Details\n\n${item.details}` : "_No details_",
    contacts.length > 0
      ? `\n## Contacts\n\n${contacts.map((c) => `- ${c.name}${c.email ? ` — ${c.email}` : ""}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const webUrl = expirationWebUrl(item.id);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={item.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={categoryName} icon={Icon.Tag} />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={item.status || "unknown"} color={statusTagColor(item)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Expiration Date" text={formatDate(date)} icon={Icon.Calendar} />
          <Detail.Metadata.Label title="Time Remaining" text={relativeExpiry(date)} icon={Icon.Clock} />
          {item.assigned_to?.name ? (
            <Detail.Metadata.Label title="Assigned To" text={item.assigned_to.name} icon={Icon.Person} />
          ) : null}
          {contacts.length > 0 ? (
            <Detail.Metadata.TagList title="Contacts">
              {contacts.map((c) => (
                <Detail.Metadata.TagList.Item key={c.id} text={c.name} />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenInWebAppAction url={webUrl} entityType="expiration_item" />
            <Action.CopyToClipboard title="Copy Name" content={item.name} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.CopyToClipboard
              title="Copy Expiration Date"
              content={formatDate(date)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {item.details ? <Action.CopyToClipboard title="Copy Details" content={item.details} /> : null}
          </ActionPanel.Section>
          <AccountActions />
        </ActionPanel>
      }
    />
  );
}
