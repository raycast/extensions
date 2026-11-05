import { Action, ActionPanel, Keyboard, List, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import ComposeForm from "./components/ComposeForm";
import ContactActions from "./components/ContactActions";
import ContactView from "./components/ContactView";
import EmailList from "./components/EmailList";
import ErrorView from "./components/ErrorView";
import { positional } from "./lib/args";
import { avatarIcon, contactFor, useContacts } from "./lib/contacts";
import { sparkJSON } from "./lib/spark";
import { ContactResult, ContactsResult } from "./lib/types";
import { actionIcon, sparkIcon } from "./lib/sparkIcons";
import { useRefreshNotice } from "./lib/ui";
import { withSparkCLI } from "./components/SparkSetup";

function Command() {
  const [query, setQuery] = useState("");
  const ready = query.trim().length >= 2;
  const {
    data: found = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (q: string) => (await sparkJSON<ContactsResult>(["contacts", positional(q)])).contacts,
    [query.trim()],
    { execute: ready, onError: () => undefined },
  );
  const results = ready ? found : [];
  const { contacts, refresh } = useContacts(results.map((c) => c.email));

  useRefreshNotice(error, results.length > 0, revalidate);

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Name, email, or domain">
      {error && ready ? (
        <ErrorView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          icon={sparkIcon("Person", Color.SecondaryText)}
          title={ready ? "No contacts found" : "Search your contacts"}
        />
      )}
      {results.map((result) => {
        const contact = contactFor(contacts, result.email);
        return (
          <List.Item
            key={result.email}
            icon={avatarIcon(result, contact)}
            title={result.name ?? result.email}
            subtitle={result.name ? result.email : undefined}
            accessories={stateAccessories(contact)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Contact"
                    icon={actionIcon("Person")}
                    target={<ContactView email={result.email} onChanged={refresh} />}
                  />
                  <Action.Push
                    title="Compose Email"
                    icon={actionIcon("Composer")}
                    target={<ComposeForm to={result.email} />}
                  />
                  <Action.Push
                    title="Show Emails"
                    icon={actionIcon("SystemFolderInbox")}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={
                      <EmailList
                        args={["search", "--filter", `from:${result.email}`]}
                        navigationTitle={`From ${result.name ?? result.email}`}
                        emptyTitle="No emails from this contact"
                      />
                    }
                  />
                  <Action.CopyToClipboard
                    title="Copy Email Address"
                    content={result.email}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                </ActionPanel.Section>
                <ContactActions email={result.email} contact={contact} onChanged={refresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function stateAccessories(contact: ContactResult | null | undefined): List.Item.Accessory[] {
  if (!contact) return [];
  const accessories: List.Item.Accessory[] = [];
  if (contact.is_priority) accessories.push({ icon: sparkIcon("PrioritySender", Color.Orange), tooltip: "Priority" });
  if (contact.blocked) accessories.push({ icon: sparkIcon("SystemFolderBlocked", Color.Red), tooltip: "Blocked" });
  else if (!contact.accepted) accessories.push({ tag: "New sender", tooltip: "Waiting in GateKeeper" });
  return accessories;
}

export default withSparkCLI(Command);
