import { ActionPanel, Action, List, showToast, Toast, Clipboard, Icon, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { PassboltClient } from "./lib/passbolt";
import ResourceDetail from "./details";
import { Resource } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [allItems, setAllItems] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [client] = useState(() => new PassboltClient());

  // Load all resources once on mount
  useEffect(() => {
    async function fetchResources() {
      setIsLoading(true);
      try {
        // Fetch all resources (empty query returns all)
        const response = await client.searchResources("");
        if (response.body && Array.isArray(response.body)) {
          setAllItems(response.body);
        } else {
          console.log("Response body is not an array:", response);
          setAllItems([]);
        }
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch resources",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchResources();
  }, [client]);

  // Filter items client-side for instant feedback
  const filteredItems = useMemo(() => {
    if (!searchText) return allItems;

    const lowerSearch = searchText.toLowerCase();
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        (item.username && item.username.toLowerCase().includes(lowerSearch)) ||
        (item.uri && item.uri.toLowerCase().includes(lowerSearch)) ||
        (item.description && item.description.toLowerCase().includes(lowerSearch)),
    );
  }, [searchText, allItems]);

  // Separate favorites from other items
  const { favoriteItems, otherItems } = useMemo(() => {
    const favorites: Resource[] = [];
    const others: Resource[] = [];

    filteredItems.forEach((item) => {
      if (item.favorite) {
        favorites.push(item);
      } else {
        others.push(item);
      }
    });

    return { favoriteItems: favorites, otherItems: others };
  }, [filteredItems]);

  async function copyPassword(resourceId: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Decrypting password..." });
    try {
      const secretRes = await client.getSecret(resourceId);
      // secretRes is usually { id, data, ... } or just the secret object
      // The secret data is in `data` field usually, encrypted.
      // Wait, `getSecret` returns `json.body`.
      // Check API docs for `viewSecret`.
      // Response body: { id, user_id, resource_id, data, ... }
      // `data` is the encrypted secret.

      if (!secretRes || !secretRes.data) {
        throw new Error("No secret data found");
      }

      const decrypted = await client.decryptSecret(secretRes.data);
      await Clipboard.copy(decrypted);
      toast.style = Toast.Style.Success;
      toast.title = "Password copied!";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to decrypt";
      toast.message = String(error);
    }
  }

  const isEmpty = allItems.length === 0;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search vault..."
      filtering={false}
    >
      {!isLoading && isEmpty ? (
        <List.EmptyView
          icon={{ source: Icon.Lock, tintColor: Color.SecondaryText }}
          title="Vault is empty"
          description="No passwords found in your Passbolt vault"
        />
      ) : !isLoading && filteredItems.length === 0 ? (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title="No matching items found"
          description="Try a different search term"
        />
      ) : (
        <>
          {favoriteItems.length > 0 && (
            <List.Section title="⭐ Favorites" subtitle={`${favoriteItems.length} items`}>
              {favoriteItems.map((item) => (
                <ResourceListItem key={item.id} item={item} client={client} onCopyPassword={copyPassword} />
              ))}
            </List.Section>
          )}
          <List.Section
            title={favoriteItems.length > 0 ? "Other Items" : "All Items"}
            subtitle={`${otherItems.length} items`}
          >
            {otherItems.map((item) => (
              <ResourceListItem key={item.id} item={item} client={client} onCopyPassword={copyPassword} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

interface ResourceListItemProps {
  item: Resource;
  client: PassboltClient;
  onCopyPassword: (id: string) => void;
}

function ResourceListItem({ item, client, onCopyPassword }: ResourceListItemProps) {
  const accessories: List.Item.Accessory[] = [];

  // Add URI as text accessory
  if (item.uri) {
    accessories.push({ text: item.uri });
  }

  // Add tags
  if (item.tags && item.tags.length > 0) {
    item.tags.slice(0, 2).forEach((tag) => {
      accessories.push({
        tag: {
          value: tag.slug,
          color: tag.is_shared ? Color.Green : Color.Blue,
        },
      });
    });
  }

  return (
    <List.Item
      title={item.name}
      subtitle={item.username}
      icon={item.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Key}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Password">
            <Action
              title="Copy Password"
              onAction={() => onCopyPassword(item.id)}
              icon={Icon.Key}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.Push
              title="Show Details"
              target={<ResourceDetail resource={item} client={client} />}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Quick Actions">
            {item.username && (
              <Action.CopyToClipboard
                title="Copy Username"
                content={item.username}
                icon={Icon.Person}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {item.uri && (
              <>
                <Action.OpenInBrowser
                  title="Open URI"
                  url={item.uri}
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                />
                <Action.CopyToClipboard title="Copy URI" content={item.uri} icon={Icon.Link} />
              </>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
