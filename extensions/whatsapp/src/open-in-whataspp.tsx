import { ActionPanel, Action, List, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { loadContacts, refreshContacts } from "./contact";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [contacts, setContacts] = useState<{ name: string; phone: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrRefreshContacts() {
      try {
        const cached = loadContacts();
        if (cached.length > 0) {
          setContacts(cached);
          setIsLoading(false);
        } else {
          const refreshed = await refreshContacts();
          setContacts(refreshed);
          setIsLoading(false);
        }
        showToast({ style: Toast.Style.Animated, title: "Fetching contacts..." });
      } catch (err) {
        console.error("Error loading contacts:", err);
      }
    }

    loadOrRefreshContacts();
  }, []);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchText.toLowerCase()) ||
      contact.phone.toLowerCase().includes(searchText.toLowerCase()),
  );

  async function handleRefresh() {
    setIsLoading(true);
    showToast({ style: Toast.Style.Animated, title: "Refreshing Contacts..." });
    const newContacts = await refreshContacts();
    setContacts(newContacts);
    setIsLoading(false);
    showToast({ style: Toast.Style.Success, title: "Contacts Refreshed!" });
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search WhatsApp contact...">
      {filteredContacts.map((contact, index) => (
        <List.Item
          key={contact.phone + contact.name + index}
          title={contact.name}
          subtitle={contact.phone}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Whatsapp"
                url={`whatsapp://send?phone=${contact.phone.replace(/\D/g, "")}`}
              />
              <Action title="Refresh Contacts" onAction={handleRefresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
