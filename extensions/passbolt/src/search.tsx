import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Clipboard,
  Icon,
  Color,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useMemo, useRef } from "react";
import { getPassboltClient, PassboltClient } from "./lib/passbolt";
import { getActiveWebsites } from "./lib/active-website";
import { partitionResourcesByWebsite, websiteHostname, chooseActiveWebsite, type ActiveWebsite } from "./utils/website";
import ResourceDetail from "./details";
import { Resource } from "./types";
import { filterResources } from "./utils/resources";

export default function Command(props: LaunchProps<{ launchContext?: { url?: string } }>) {
  const [searchText, setSearchText] = useState("");
  const [allItems, setAllItems] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [client] = useState(() => getPassboltClient());

  const [activeWebsites, setActiveWebsites] = useState<ActiveWebsite[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const autoSelect = useRef(true);
  const { matchCurrentWebsite = true } = getPreferenceValues<Preferences.Search>();

  useEffect(() => {
    let cancelled = false;
    setActiveWebsites([]);
    if (matchCurrentWebsite) {
      getActiveWebsites(props.launchContext?.url).then((websites) => {
        if (!cancelled) setActiveWebsites(websites);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [matchCurrentWebsite, props.launchContext?.url]);

  // The best website can change while entries stream in: a partial vault can favor a
  // title-only match for one window over an exact match for another. Re-evaluate on
  // every update so the choice settles on the complete vault instead of freezing the
  // first guess; the row selection pin below keeps the selection stable meanwhile.
  const activeWebsite = useMemo(() => chooseActiveWebsite(allItems, activeWebsites), [allItems, activeWebsites]);

  // Load all resources once on mount; closing the command cancels the load and its
  // remaining decryption work instead of continuing in the background.
  useEffect(() => {
    const controller = new AbortController();
    async function fetchResources() {
      setIsLoading(true);
      try {
        // Fetch all resources (empty query returns all); decrypted entries appear
        // progressively through throttled snapshots from the decryptor.
        const response = await client.searchResources("", {
          signal: controller.signal,
          onProgress: ({ items }) => {
            if (!controller.signal.aborted) setAllItems(items);
          },
        });
        if (controller.signal.aborted) return;
        if (response.body && Array.isArray(response.body)) {
          setAllItems(response.body);
          const failures = response.body.filter((resource) => resource.metadata_error);
          if (failures.length) {
            await showToast({
              style: Toast.Style.Failure,
              title: `Could not decrypt metadata for ${failures.length} resources`,
              message: failures[0].metadata_error,
            });
          }
        } else {
          setAllItems([]);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch resources",
          message: String(error),
        });
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    fetchResources();
    return () => controller.abort();
  }, [client]);

  // Filter items client-side for instant feedback
  const filteredItems = useMemo(() => filterResources(allItems, searchText), [allItems, searchText]);

  const { matching, others: remainingItems } = useMemo(
    () => partitionResourcesByWebsite(filteredItems, activeWebsite?.url, activeWebsite?.title),
    [filteredItems, activeWebsite],
  );

  // Separate favorites from the remaining items
  const { favoriteItems, otherItems } = useMemo(() => {
    const favorites: Resource[] = [];
    const others: Resource[] = [];

    remainingItems.forEach((item) => {
      if (item.favorite) {
        favorites.push(item);
      } else {
        others.push(item);
      }
    });

    return { favoriteItems: favorites, otherItems: others };
  }, [remainingItems]);

  useEffect(() => {
    if (!autoSelect.current || searchText || !matching.length) return;
    autoSelect.current = false;
    setSelectedItemId(matching[0].id);
  }, [matching, searchText]);

  const onSelectionChange = (id: string | null) => {
    if (id === null) return;
    // Raycast also reports its default first selection as streamed items arrive.
    const firstId = matching[0]?.id ?? favoriteItems[0]?.id ?? otherItems[0]?.id;
    if (id !== firstId) autoSelect.current = false;
    setSelectedItemId(id);
  };
  const onSearchTextChange = (text: string) => {
    if (text) autoSelect.current = false;
    setSearchText(text);
    setSelectedItemId(undefined);
  };

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
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={onSelectionChange}
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
          {matching.length > 0 && (
            <List.Section
              key="current-website"
              title={`Current Website · ${websiteHostname(activeWebsite?.url)}`}
              subtitle={`${matching.length} items`}
            >
              {matching.map((item) => (
                <ResourceListItem key={item.id} item={item} client={client} onCopyPassword={copyPassword} />
              ))}
            </List.Section>
          )}
          {favoriteItems.length > 0 && (
            <List.Section key="favorites" title="⭐ Favorites" subtitle={`${favoriteItems.length} items`}>
              {favoriteItems.map((item) => (
                <ResourceListItem key={item.id} item={item} client={client} onCopyPassword={copyPassword} />
              ))}
            </List.Section>
          )}
          {otherItems.length > 0 && (
            <List.Section
              key="other-items"
              title={matching.length > 0 || favoriteItems.length > 0 ? "Other Items" : "All Items"}
              subtitle={`${otherItems.length} items`}
            >
              {otherItems.map((item) => (
                <ResourceListItem key={item.id} item={item} client={client} onCopyPassword={copyPassword} />
              ))}
            </List.Section>
          )}
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

  if (item.metadata_error) {
    accessories.push({ icon: Icon.ExclamationMark, tooltip: item.metadata_error });
  }

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
      id={item.id}
      title={item.name || "Unnamed resource"}
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
