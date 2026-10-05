import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { nanoid as randomId } from "nanoid";
import formatTimeDistance from "fromnow";
import { useWhatsAppChats } from "./utils/use-whatsapp-chats";
import { isPhoneChat, PhoneChat, WhatsAppChat } from "./utils/types";
import { DatabaseChat, isDatabaseAvailable, readDatabaseChats } from "./services/readLocalDatabase";

type Filter = "new" | "all";

export default function ImportFromDatabase() {
  const [chats, setChats] = useWhatsAppChats();
  const [dbChats, setDbChats] = useState<DatabaseChat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("new");

  useEffect(() => {
    if (!isDatabaseAvailable()) {
      setError("WhatsApp database not found at the expected macOS path. Is WhatsApp installed?");
      setDbChats([]);
      return;
    }
    readDatabaseChats()
      .then(setDbChats)
      .catch((e: Error) => {
        setError(e.message);
        setDbChats([]);
      });
  }, []);

  const existingPhones = new Set(chats.filter(isPhoneChat).map((c) => c.phone));
  const visibleChats = (dbChats ?? []).filter((c) => filter === "all" || !existingPhones.has(c.phone));
  const newCount = (dbChats ?? []).filter((c) => !existingPhones.has(c.phone)).length;

  function importChats(toImport: DatabaseChat[]) {
    const already = new Set(chats.filter(isPhoneChat).map((c) => c.phone));
    const additions: WhatsAppChat[] = [];
    for (const c of toImport) {
      if (already.has(c.phone)) continue;
      already.add(c.phone);
      const newChat: PhoneChat = {
        id: randomId(),
        name: c.name,
        phone: c.phone,
        pinned: false,
        lastOpened: undefined,
      };
      additions.push(newChat);
    }
    if (additions.length === 0) {
      showToast(Toast.Style.Success, "Nothing to import", "All matching chats are already added.");
      return;
    }
    setChats([...chats, ...additions]);
    showToast(Toast.Style.Success, `Imported ${additions.length} chat${additions.length === 1 ? "" : "s"}`);
  }

  return (
    <List
      isLoading={dbChats === null}
      searchBarPlaceholder="Filter by name or phone number..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" value={filter} onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Item title={`New (${newCount})`} value="new" />
          <List.Dropdown.Item title={`All (${dbChats?.length ?? 0})`} value="all" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Cannot read WhatsApp database" description={error} />
      ) : dbChats && dbChats.length === 0 ? (
        <List.EmptyView icon={Icon.Person} title="No chats found in the local database" />
      ) : (
        <List.Section
          title={filter === "new" ? "New Chats" : "All Chats"}
          subtitle={`${visibleChats.length} chat${visibleChats.length === 1 ? "" : "s"}`}
        >
          {visibleChats.map((c) => {
            const alreadyAdded = existingPhones.has(c.phone);
            return (
              <List.Item
                key={c.phone}
                title={c.name}
                subtitle={c.phone}
                icon={alreadyAdded ? Icon.CheckCircle : Icon.Person}
                accessories={[
                  {
                    text: c.lastMessageAt ? formatTimeDistance(c.lastMessageAt, { suffix: true, max: 1 }) : "",
                    tooltip: "Last message",
                  },
                ]}
                keywords={[c.phone, c.phone.replace(/\D/g, "")]}
                actions={
                  <ActionPanel>
                    {!alreadyAdded ? (
                      <Action title="Import This Chat" icon={Icon.Plus} onAction={() => importChats([c])} />
                    ) : null}
                    {newCount > 0 ? (
                      <Action
                        title={`Import All ${newCount} New Chat${newCount === 1 ? "" : "s"}`}
                        icon={Icon.Download}
                        onAction={() => importChats(dbChats ?? [])}
                      />
                    ) : null}
                    <Action.CopyToClipboard title="Copy Phone Number" content={c.phone} />
                    <Action.CopyToClipboard title="Copy Name" content={c.name} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
