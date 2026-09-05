import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { listExpirationsForContact } from "../api/endpoints";
import { Contact } from "../api/types";
import { contactWebUrl } from "../lib/links";
import { track } from "../lib/telemetry";
import { AccountActions, OpenInWebAppAction } from "./actions";
import { ExpirationListItem } from "./ExpirationListItem";

/** A contact's expiration items — pushed from a contact row or the standalone command. */
export function ContactExpirationsView({ contact }: { contact: Contact }) {
  const { pop } = useNavigation();

  useEffect(() => track({ name: "detail_viewed", entity_type: "contact" }), []);

  const { isLoading, data, pagination } = usePromise(
    (contactId: string) =>
      async ({ page }: { page: number }) => {
        const apiPage = page + 1;
        const res = await listExpirationsForContact(contactId, { page: apiPage });
        track({ name: "list_viewed", command_name: "contact-expirations", result_count: res.total, page: apiPage });
        return { data: res.expiration_items, hasMore: apiPage < res.pages };
      },
    [contact.id],
  );

  const items = data ?? [];
  const backAction = (
    <Action title="Back to Contacts" icon={Icon.ArrowLeft} shortcut={{ modifiers: ["cmd"], key: "[" }} onAction={pop} />
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${contact.name} — Expirations`}
      searchBarPlaceholder={`Filter ${contact.name}'s expirations…`}
    >
      {!isLoading && items.length === 0 ? (
        <List.EmptyView
          icon="icon.png"
          title="This contact has no expirations"
          actions={
            <ActionPanel>
              <OpenInWebAppAction
                url={contactWebUrl(contact.id)}
                entityType="contact"
                title="Open Contact in Web App"
              />
              {backAction}
              <AccountActions />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={contact.name} subtitle={`${items.length} loaded`}>
          {items.map((item) => (
            <ExpirationListItem key={item.id} item={item} extraActions={backAction} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
