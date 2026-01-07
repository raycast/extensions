import { useState, useEffect } from "react";
import { List, ActionPanel, Action, showToast, Toast, openExtensionPreferences, Icon, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { client } from "./api/client";
import { getLanguageName } from "./data/languages";
import { syncFromLokalise, needsInitialSync } from "./api/sync-service";

type SortOption = "name-asc" | "name-desc" | "created-desc" | "created-asc" | "modified-desc" | "modified-asc";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("created-desc");
  const [dropdownSelection, setDropdownSelection] = useState<string>("sort-created-desc");
  const [viewingDetails, setViewingDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Check if initial sync is needed
  useEffect(() => {
    needsInitialSync().then(setNeedsSync);
  }, []);

  // Fetch keys from database
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (platforms: string[], searchQuery: string, sort: SortOption) => {
      // Check if we need initial sync
      if (await needsInitialSync()) {
        return [];
      }

      return await client.listKeysFromDatabase({
        platforms: platforms.length > 0 ? platforms : undefined,
        searchQuery: searchQuery || undefined,
        searchInTranslations: true,
        sortBy: sort,
      });
    },
    [selectedPlatforms, searchText, sortBy],
    {
      initialData: [],
      onError: async (error: unknown) => {
        if (
          error instanceof Error &&
          (error.message.includes("not configured") || error.message.includes("API token"))
        ) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Missing Configuration",
            message: "Please set your API token and project ID in preferences",
          });
          openExtensionPreferences();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: error instanceof Error ? error.message : "Failed to fetch translations",
          });
        }
      },
    },
  );

  const filteredKeys = data || [];

  // Fetch translations when viewing details
  const { data: processedKey, isLoading: isLoadingDetails } = useCachedPromise(
    async (keyId: number) => {
      if (!keyId) return null;
      const key = await client.getKey(keyId);
      return client.processKey(key, getLanguageName);
    },
    [selectedKeyId || 0],
    {
      execute: !!selectedKeyId && viewingDetails,
    },
  );

  // Handle manual sync
  const handleSync = async () => {
    setIsSyncing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing translations...",
    });

    try {
      const result = await syncFromLokalise((current, total) => {
        toast.message = `${current} of ~${total} keys`;
      });

      if (result.success) {
        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Sync Complete",
          message: `${result.keysCount} keys synced`,
        });
        setNeedsSync(false);
        revalidate();
      } else {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Sync Failed",
          message: result.error?.message || "Unknown error",
        });
      }
    } catch (error) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Show detail view if viewingDetails is true
  if (viewingDetails && selectedKeyId) {
    const selectedKey = (data || []).find((key) => key.keyId === selectedKeyId);
    if (!selectedKey) {
      return (
        <Detail
          metadata={
            <Detail.Metadata>
              <Detail.Metadata.Label title="Error" text="Key Not Found" />
            </Detail.Metadata>
          }
          actions={
            <ActionPanel>
              <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setViewingDetails(false)} />
            </ActionPanel>
          }
        />
      );
    }

    const keyToDisplay = processedKey && processedKey.keyId === selectedKeyId ? processedKey : selectedKey;

    const screenshotMarkdown =
      keyToDisplay.screenshots.length > 0
        ? `${keyToDisplay.screenshots.map((s) => `![${s.title}](${s.url})`).join("\n\n")}`
        : "";

    return (
      <Detail
        isLoading={isLoadingDetails}
        markdown={screenshotMarkdown}
        metadata={
          <Detail.Metadata>
            <Detail.Metadata.Label title="Key Name" text={keyToDisplay.keyName} />
            {keyToDisplay.defaultTranslation && (
              <Detail.Metadata.Label title="Default Translation" text={keyToDisplay.defaultTranslation} />
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Platforms" text={keyToDisplay.platforms.join(", ") || "N/A"} />
            <Detail.Metadata.Label title="Is Plural" text={keyToDisplay.isPlural ? "Yes" : "No"} />
            <Detail.Metadata.Label title="Tags" text={keyToDisplay.tags.join(", ") || "None"} />
            {keyToDisplay.description && <Detail.Metadata.Label title="Description" text={keyToDisplay.description} />}
            {keyToDisplay.context && <Detail.Metadata.Label title="Context" text={keyToDisplay.context} />}
            {keyToDisplay.translations.length > 0 && (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Label title="Translations" />
                {keyToDisplay.translations.map((trans, index) => (
                  <Detail.Metadata.Label key={index} title={trans.languageName} text={trans.text} />
                ))}
              </>
            )}
          </Detail.Metadata>
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Key Name" content={keyToDisplay.keyName} />
            {keyToDisplay.mainTranslation && (
              <Action.CopyToClipboard title="Copy Translation" content={keyToDisplay.mainTranslation} />
            )}
            {keyToDisplay.screenshots.length > 0 && (
              <>
                {keyToDisplay.screenshots.length === 1 ? (
                  <Action.Open
                    title={`Open ${keyToDisplay.screenshots[0].title}`}
                    icon={Icon.Image}
                    target={keyToDisplay.screenshots[0].url}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                ) : (
                  keyToDisplay.screenshots.map((screenshot, index) => (
                    <Action.Open
                      key={index}
                      title={`Open ${screenshot.title}`}
                      icon={Icon.Image}
                      target={screenshot.url}
                      shortcut={index === 0 ? { modifiers: ["cmd"], key: "s" } : undefined}
                    />
                  ))
                )}
              </>
            )}
            <Action title="Back to List" icon={Icon.ArrowLeft} onAction={() => setViewingDetails(false)} />
          </ActionPanel>
        }
      />
    );
  }

  if (
    error &&
    error instanceof Error &&
    (error.message.includes("not configured") || error.message.includes("API token"))
  ) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Configuration Required"
          description="Please set your API token and project ID in extension preferences"
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Show sync prompt if database is empty
  if (needsSync && !isSyncing) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="Initial Sync Required"
          description="Sync translations from Lokalise to enable local filtering"
          actions={
            <ActionPanel>
              <Action
                title="Sync Now"
                icon={Icon.ArrowClockwise}
                onAction={handleSync}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Handle dropdown change (combined filter & sort)
  const handleDropdownChange = (value: string) => {
    setDropdownSelection(value);
    const [type, ...rest] = value.split("-");
    const action = rest.join("-");

    if (type === "filter") {
      if (action === "all") {
        setSelectedPlatforms([]);
      } else {
        // Toggle the platform
        setSelectedPlatforms((prev) => {
          if (prev.includes(action)) {
            return prev.filter((p) => p !== action);
          } else {
            return [...prev, action];
          }
        });
      }
    } else if (type === "sort") {
      setSortBy(action as SortOption);
    }
  };

  return (
    <List
      isLoading={isLoading || isSyncing}
      searchBarPlaceholder="Search translation keys..."
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter & Sort" value={dropdownSelection} onChange={handleDropdownChange}>
          <List.Dropdown.Section title="Filter by Platform">
            <List.Dropdown.Item
              title="All Platforms"
              value="filter-all"
              icon={selectedPlatforms.length === 0 ? Icon.CheckCircle : Icon.Circle}
            />
            <List.Dropdown.Item
              title="Web"
              value="filter-web"
              icon={selectedPlatforms.includes("web") ? Icon.CheckCircle : Icon.Circle}
            />
            <List.Dropdown.Item
              title="iOS"
              value="filter-ios"
              icon={selectedPlatforms.includes("ios") ? Icon.CheckCircle : Icon.Circle}
            />
            <List.Dropdown.Item
              title="Android"
              value="filter-android"
              icon={selectedPlatforms.includes("android") ? Icon.CheckCircle : Icon.Circle}
            />
            <List.Dropdown.Item
              title="Other"
              value="filter-other"
              icon={selectedPlatforms.includes("other") ? Icon.CheckCircle : Icon.Circle}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Sort By">
            <List.Dropdown.Item title="Name (A-Z)" value="sort-name-asc" icon={Icon.ArrowUp} />
            <List.Dropdown.Item title="Name (Z-A)" value="sort-name-desc" icon={Icon.ArrowDown} />
            <List.Dropdown.Item title="Created (Newest)" value="sort-created-desc" icon={Icon.Calendar} />
            <List.Dropdown.Item title="Created (Oldest)" value="sort-created-asc" icon={Icon.Calendar} />
            <List.Dropdown.Item title="Modified (Newest)" value="sort-modified-desc" icon={Icon.Clock} />
            <List.Dropdown.Item title="Modified (Oldest)" value="sort-modified-asc" icon={Icon.Clock} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {filteredKeys.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No translations found" : "No translations"}
          description={searchText ? "Try a different search term" : "Sync translations to get started"}
          actions={
            <ActionPanel>
              <Action
                title="Sync Now"
                icon={Icon.ArrowClockwise}
                onAction={handleSync}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredKeys.map((key) => {
          return (
            <List.Item
              key={key.keyId}
              id={key.keyId.toString()}
              title={key.keyName}
              subtitle={key.defaultTranslation || undefined}
              accessories={[
                { text: key.isPlural ? "Plural" : "", icon: key.isPlural ? Icon.Document : undefined },
                { text: key.platforms.join(", ") || "" },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title="View Details"
                      icon={Icon.Eye}
                      onAction={() => {
                        setSelectedKeyId(key.keyId);
                        setViewingDetails(true);
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Key Name"
                      content={key.keyName}
                      shortcut={{ modifiers: ["cmd"], key: "k" }}
                    />
                    {key.mainTranslation && (
                      <Action.CopyToClipboard
                        title="Copy Translation"
                        content={key.mainTranslation}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    )}
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Sync Now"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={handleSync}
                    />
                    <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
