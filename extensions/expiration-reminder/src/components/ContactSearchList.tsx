import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { searchContacts } from "../api/endpoints";
import { Contact } from "../api/types";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { contactWebUrl } from "../lib/links";
import { track } from "../lib/telemetry";
import { AccountActions, OpenInWebAppAction } from "./actions";
import { ContactExpirationsView } from "./ContactExpirationsView";

const MIN_QUERY = 2;

function looksLikeEmail(value: string): boolean {
  return /\S+@\S+/.test(value);
}

/**
 * Debounced contact search used by both "Search Contacts" and
 * "Show a Contact's Expirations". The primary action drills into the contact's
 * expirations (PRD §6.5/§6.6).
 */
export function ContactSearchList({ commandName }: { commandName: string }) {
  const [searchText, setSearchText] = useState("");
  const query = useDebouncedValue(searchText.trim(), 300);
  const abortable = useRef<AbortController | undefined>(undefined);

  useEffect(() => track({ name: "command_opened", command_name: commandName }), [commandName]);

  const { isLoading, data } = usePromise(
    async (q: string) => {
      const startedAt = Date.now();
      const params = looksLikeEmail(q) ? { email: q } : { term: q };
      const res = await searchContacts({ ...params, paging: 50, sort: "name", signal: abortable.current?.signal });
      track({
        name: "search_executed",
        command_name: commandName,
        query_length: q.length,
        result_count: res.contacts.length,
        latency_ms: Date.now() - startedAt,
      });
      return res.contacts;
    },
    [query],
    { execute: query.length >= MIN_QUERY, abortable },
  );

  const contacts = data ?? [];
  const showHint = query.length > 0 && query.length < MIN_QUERY;

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contacts by name or email…"
    >
      {showHint ? (
        <List.EmptyView
          icon="icon.png"
          title="Keep typing…"
          description={`Enter at least ${MIN_QUERY} characters to search.`}
        />
      ) : !isLoading && query.length >= MIN_QUERY && contacts.length === 0 ? (
        <List.EmptyView icon="icon.png" title="No contacts found" description={`No contacts match “${query}”.`} />
      ) : (
        contacts.map((contact) => <ContactListItem key={contact.id} contact={contact} />)
      )}
    </List>
  );
}

function ContactListItem({ contact }: { contact: Contact }) {
  const accessories: List.Item.Accessory[] = [];
  if (contact.phone || contact.mobile) {
    accessories.push({ icon: Icon.Phone, text: contact.phone || contact.mobile });
  }

  return (
    <List.Item
      icon={Icon.Person}
      title={contact.name}
      subtitle={contact.email}
      accessories={accessories}
      keywords={[contact.email].filter(Boolean) as string[]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Expirations"
              icon={Icon.List}
              target={<ContactExpirationsView contact={contact} />}
            />
            <OpenInWebAppAction url={contactWebUrl(contact.id)} entityType="contact" title="Open Contact in Web App" />
            {contact.email ? (
              <Action.CopyToClipboard
                title="Copy Email"
                content={contact.email}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            ) : null}
            {contact.phone || contact.mobile ? (
              <Action.CopyToClipboard
                title="Copy Phone"
                content={(contact.phone || contact.mobile) as string}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
          </ActionPanel.Section>
          <AccountActions />
        </ActionPanel>
      }
    />
  );
}
