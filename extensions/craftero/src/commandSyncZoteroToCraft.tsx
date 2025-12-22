import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { CraftClient } from "./lib/craft";
import {
  getLocalCollections,
  resolveZoteroDbPath,
  searchLocalItems,
} from "./lib/localZotero";
import {
  buildCraftProperties,
  buildSchemaIndex,
  formatDateTitle,
  getJournalPublisher,
  getLocalDateString,
  getReadingDateProperty,
  normalizeName,
} from "./lib/mapping";
import {
  CraftCollectionSchemaProperty,
  ZoteroCollection,
  ZoteroItem,
} from "./lib/types";
import { ZoteroClient } from "./lib/zotero";

interface Preferences {
  zotero_db_path?: string;
  cache_period?: string;
  zotero_collection_id?: string;
  craft_api_base: string;
  craft_api_key?: string;
  craft_space_id?: string;
  craft_collection_id: string;
  sync_notes?: boolean;
  max_items?: string;
}

type SyncStatus = "created" | "updated" | "deleted" | "skipped" | "error";

interface SyncLog {
  title: string;
  status: SyncStatus;
  details?: string;
  errorDetails?: string;
  payload?: string;
  url?: string;
  zoteroLink?: string;
}

export default function CommandSyncZoteroToCraft() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<ZoteroItem[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [collections, setCollections] = useState<ZoteroCollection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    () => {
      return normalizeOptional(preferences.zotero_collection_id) || "all";
    },
  );
  const [existingVersion, setExistingVersion] = useState(0);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const craftClientRef = useRef<CraftClient | null>(null);
  const schemaIndexRef = useRef<Map<string, CraftCollectionSchemaProperty>>(
    new Map(),
  );
  const contentFieldKeyRef = useRef<string>("title");
  const schemaLoadedRef = useRef(false);
  const dailyNoteIdRef = useRef<string | null>(null);
  const readingDateWarningRef = useRef(false);
  const bibtexCacheRef = useRef<Map<string, string>>(new Map());
  const searchCacheRef = useRef<Map<string, ZoteroItem[]>>(new Map());
  const existingItemsRef = useRef<Map<string, string>>(new Map());
  const existingTitlesLoadedRef = useRef(false);
  const maxItemsRef = useRef(10);
  const cachePeriodRef = useRef(10);
  const localDbWarningRef = useRef(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    void loadResults(searchText);
  }, [searchText, initialized, selectedCollectionId]);

  useEffect(() => {
    if (!initialized) return;
    if (results.length === 0) return;
    if (existingTitlesLoadedRef.current) return;
    void ensureExistingItems();
  }, [initialized, results, existingVersion]);

  const addLog = (log: SyncLog) => {
    setLogs((prev) => [...prev, log]);
  };

  const initialize = async () => {
    try {
      const zoteroCollectionId = normalizeOptional(
        preferences.zotero_collection_id,
      );
      const craftApiBase = requirePreference(
        preferences.craft_api_base,
        "Craft API Base URL",
      );
      const craftApiKey = normalizeOptional(preferences.craft_api_key);
      const craftCollectionId = requirePreference(
        preferences.craft_collection_id,
        "Craft Collection ID",
      );

      maxItemsRef.current = parseCount(preferences.max_items, 10);
      cachePeriodRef.current = parseCount(preferences.cache_period, 10);

      const resolvedDbPath = resolveZoteroDbPath(preferences.zotero_db_path);
      try {
        const localCollections = await getLocalCollections(
          resolvedDbPath,
          cachePeriodRef.current,
        );
        setCollections(formatCollections(localCollections));
      } catch {
        setCollections([]);
        if (!localDbWarningRef.current) {
          addLog({
            title: "Zotero",
            status: "skipped",
            details: `Zotero DB not found at ${resolvedDbPath}; collection filtering disabled.`,
          });
          localDbWarningRef.current = true;
        }
      }
      if (!zoteroCollectionId) {
        setSelectedCollectionId("all");
      }

      craftClientRef.current = new CraftClient({
        apiKey: craftApiKey,
        apiBaseUrl: craftApiBase,
        collectionId: craftCollectionId,
      });

      setInitialized(true);
      setIsLoadingResults(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Initialization failed",
        message,
      });
      addLog({ title: "System", status: "error", details: message });
      setIsLoadingResults(false);
    }
  };

  const loadResults = async (query: string) => {
    const requestId = ++requestIdRef.current;
    const trimmed = query.trim();
    const canFilterCollection = selectedCollectionId !== "all";
    const collectionKey = canFilterCollection ? selectedCollectionId : "all";
    const cacheKey = `${collectionKey}:${trimmed}`;

    if (!trimmed) {
      if (requestId === requestIdRef.current) {
        setResults([]);
        setIsLoadingResults(false);
      }
      return;
    }

    const cached = searchCacheRef.current.get(cacheKey);
    if (cached) {
      if (requestId === requestIdRef.current) {
        setResults(cached);
        setIsLoadingResults(false);
      }
      return;
    }

    setIsLoadingResults(true);

    try {
      const limit = maxItemsRef.current;
      let items: ZoteroItem[] = [];

      const localDbPath = resolveZoteroDbPath(preferences.zotero_db_path);
      const collectionId =
        selectedCollectionId === "all" ? null : selectedCollectionId;
      items = await searchLocalItems(
        localDbPath,
        trimmed,
        limit,
        collectionId,
        cachePeriodRef.current,
      );

      if (requestId === requestIdRef.current) {
        searchCacheRef.current.set(cacheKey, items);
        setResults(items);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Zotero search failed",
        message,
      });
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingResults(false);
      }
    }
  };

  const ensureExistingItems = async () => {
    if (existingTitlesLoadedRef.current) return;

    const craftClient = craftClientRef.current;
    if (!craftClient) return;

    try {
      const items = await craftClient.getCollectionItems();
      existingItemsRef.current = new Map(
        items
          .filter((item) => {
            const props = item.properties || {};
            const zoteroLink = Object.values(props).find(
              (value) =>
                typeof value === "string" &&
                value.startsWith("zotero://select/library/items/"),
            );
            return zoteroLink;
          })
          .map((item) => {
            const props = item.properties || {};
            const zoteroLink = Object.values(props).find(
              (value) =>
                typeof value === "string" &&
                value.startsWith("zotero://select/library/items/"),
            ) as string;
            return [zoteroLink, item.id];
          }),
      );
      existingTitlesLoadedRef.current = true;
      setExistingVersion((prev) => prev + 1);
    } catch (error) {
      addLog({
        title: "Craft",
        status: "error",
        details:
          "Failed to read existing items; continuing without deduplication.",
      });
    }
  };

  const ensureCraftSchemaLoaded = async () => {
    if (schemaLoadedRef.current) return;
    const craftClient = craftClientRef.current;
    if (!craftClient) throw new Error("Craft not configured.");

    const schema = await craftClient.getCollectionSchema();
    schemaIndexRef.current = buildSchemaIndex(schema);
    contentFieldKeyRef.current = schema?.contentPropDetails?.key || "title";
    schemaLoadedRef.current = true;
  };

  const getTagsProperty = () => {
    const schemaIndex = schemaIndexRef.current;
    return (
      schemaIndex.get(normalizeName("tags")) ||
      schemaIndex.get(normalizeName("tag"))
    );
  };

  const syncItems = async (
    items: ZoteroItem[],
    options?: { openAfterSync?: boolean },
  ) => {
    if (isSyncing) return;
    const craftClient = craftClientRef.current;

    if (!craftClient) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Craft not configured",
      });
      return;
    }

    setIsSyncing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing to Craft",
      message: `Preparing ${items.length} items...`,
    });

    try {
      await ensureCraftSchemaLoaded();
      const schemaIndex = schemaIndexRef.current;
      await ensureExistingItems();

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let openTargetId: string | null = null;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const title = item.data.title?.trim() || "Untitled";
        const zoteroUri = `zotero://select/library/items/${item.key}`;
        const tagNames = (item.data.tags || [])
          .map((tag) => tag.tag.trim())
          .filter(Boolean);
        let payload: string | undefined;

        toast.message = `Syncing ${index + 1} of ${items.length}`;

        const existingId = existingItemsRef.current.get(zoteroUri);
        try {
          const citationKeyOverride = await resolveCitationKey(
            item,
            bibtexCacheRef.current,
          );
          const properties = buildCraftProperties(item, schemaIndex, {
            citationKey: citationKeyOverride || undefined,
          });
          const tagsProp = getTagsProperty();
          const allowNewSelectOptions =
            tagNames.length > 0 &&
            (!tagsProp ||
              ["select", "multiselect"].includes(tagsProp.type.toLowerCase()));
          await applyReadingDate(
            properties,
            schemaIndex,
            dailyNoteIdRef,
            craftClientRef.current,
            addLog,
            readingDateWarningRef,
          );
          const blocks = preferences.sync_notes
            ? await buildNotesBlocks(item)
            : [];
          const url = item.data.url || item.data.DOI || undefined;
          const zoteroLink = `zotero://select/library/items/${item.key}`;
          payload = JSON.stringify({ title, properties, blocks }, null, 2);

          if (existingId) {
            await craftClient.updateCollectionItem(
              existingId,
              title,
              properties,
              contentFieldKeyRef.current,
              { allowNewSelectOptions },
            );
            if (blocks.length > 0) {
              await craftClient.addItemBlocks(existingId, blocks);
            }
            addLog({ title, status: "updated", url, zoteroLink });
            updatedCount += 1;
            if (!openTargetId && options?.openAfterSync) {
              openTargetId = existingId;
            }
          } else {
            const newId = await craftClient.createCollectionItem(
              title,
              properties,
              blocks,
              contentFieldKeyRef.current,
              { allowNewSelectOptions },
            );
            addLog({ title, status: "created", url, zoteroLink });
            createdCount += 1;
            existingItemsRef.current.set(zoteroUri, newId);
            if (!openTargetId && options?.openAfterSync) {
              openTargetId = newId;
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";
          addLog({
            title,
            status: "error",
            details: truncate(message, 140),
            errorDetails: message,
            payload,
          });
          errorCount += 1;
        }
      }

      const updateInfo = updatedCount > 0 ? `, updated ${updatedCount}` : "";
      toast.style = Toast.Style.Success;
      toast.message = `Done. Created ${createdCount}${updateInfo}, skipped ${skippedCount}, errors ${errorCount}.`;
      if (options?.openAfterSync && items.length === 1 && openTargetId) {
        const spaceId = normalizeOptional(preferences.craft_space_id);
        if (!spaceId) {
          addLog({
            title: "Craft",
            status: "skipped",
            details: "Space ID not set; deep link may only open Craft.",
          });
        }
        const deepLink = buildCraftDeepLink(openTargetId, spaceId ?? undefined);
        try {
          await open(deepLink);
        } catch {
          const webUrl = buildCraftWebUrl(
            openTargetId,
            preferences.craft_api_base,
          );
          if (webUrl) {
            await open(webUrl);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.message = message;
      addLog({
        title: "Sync",
        status: "error",
        details: message,
        errorDetails: message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteExistingItem = async (item: ZoteroItem, itemId: string) => {
    const title = item.data.title?.trim() || "Untitled";
    const zoteroUri = `zotero://select/library/items/${item.key}`;
    const confirmed = await confirmAlert({
      title: "Delete from Craft",
      message: `Delete "${title}" from Craft?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (!confirmed) return;

    const craftClient = craftClientRef.current;
    if (!craftClient) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Craft not configured",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting from Craft",
      message: title,
    });

    try {
      await craftClient.deleteCollectionItems([itemId]);
      existingItemsRef.current.delete(zoteroUri);
      setExistingVersion((prev) => prev + 1);
      addLog({
        title,
        status: "deleted",
        details: "Deleted from Craft.",
      });
      toast.style = Toast.Style.Success;
      toast.message = "Deleted.";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.style = Toast.Style.Failure;
      toast.message = message;
      addLog({
        title,
        status: "error",
        details: truncate(message, 140),
        errorDetails: message,
      });
    }
  };

  return (
    <List
      isLoading={isLoadingResults || isSyncing}
      isShowingDetail={results.length > 0}
      searchBarPlaceholder="Search Zotero..."
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <CollectionDropdown
          collections={collections}
          selected={selectedCollectionId}
          onSelection={setSelectedCollectionId}
        />
      }
    >
      {logs.length > 0 ? (
        <List.Section title="Sync Log">
          {logs.map((log, index) => (
            <List.Item
              key={`${log.title}-${index}`}
              title={log.title}
              subtitle={log.details}
              icon={statusIcon(log.status)}
              actions={
                <ActionPanel>
                  {log.errorDetails ? (
                    <Action.Push
                      title="View Error Details"
                      icon={Icon.Bug}
                      target={<Detail markdown={buildErrorMarkdown(log)} />}
                    />
                  ) : null}
                  {log.zoteroLink ? (
                    <Action.OpenInBrowser
                      title="Open in Zotero"
                      url={log.zoteroLink}
                    />
                  ) : null}
                  {log.url ? (
                    <Action.OpenInBrowser title="Open URL" url={log.url} />
                  ) : null}
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={log.title}
                  />
                  {log.errorDetails ? (
                    <Action.CopyToClipboard
                      title="Copy Error Details"
                      content={log.errorDetails}
                    />
                  ) : null}
                  {log.payload ? (
                    <Action.CopyToClipboard
                      title="Copy Payload"
                      content={log.payload}
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type to search your Zotero"
        />
      ) : (
        <List.Section title="Search Results" subtitle={`${results.length}`}>
          {results.map((item) => {
            const displayItem = item;
            const zoteroUri = `zotero://select/library/items/${displayItem.key}`;
            const existingId = existingItemsRef.current.get(zoteroUri);
            const spaceId = normalizeOptional(preferences.craft_space_id);
            const existingDeepLink = existingId
              ? buildCraftDeepLink(existingId, spaceId ?? undefined)
              : "";
            const existingWebUrl = existingId
              ? buildCraftWebUrl(existingId, preferences.craft_api_base)
              : null;
            return (
              <List.Item
                key={item.key}
                id={item.key}
                title={displayItem.data.title || "Untitled"}
                subtitle={buildSubtitle(displayItem)}
                icon={{ source: getItemIcon(displayItem.data.itemType) }}
                accessories={
                  existingId
                    ? [
                        {
                          text: "In Craft",
                          icon: Icon.Checkmark,
                        },
                      ]
                    : undefined
                }
                detail={
                  <List.Item.Detail markdown={buildItemDetail(displayItem)} />
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Sync Item to Craft"
                      icon={Icon.Upload}
                      onAction={() => void syncItems([displayItem])}
                    />
                    <Action
                      title="Sync & Open in Craft"
                      icon={Icon.ArrowRightCircle}
                      shortcut={{ modifiers: ["cmd"], key: "return" }}
                      onAction={() =>
                        void syncItems([displayItem], { openAfterSync: true })
                      }
                    />
                    <Action
                      title="Sync & AI Summarize"
                      icon={Icon.Stars}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        // Check if item is already in Craft by Zotero URI
                        const zoteroUri = `zotero://select/library/items/${displayItem.key}`;

                        // Ensure existing items are loaded
                        if (!existingTitlesLoadedRef.current) {
                          await ensureExistingItems();
                        }

                        // If item not in Craft, sync it first
                        if (!existingItemsRef.current.has(zoteroUri)) {
                          await syncItems([displayItem]);
                        }

                        const promptData = generateMCPPromptData(displayItem, {
                          zoteroUri,
                        });

                        const encodedArgument = encodeURIComponent(
                          JSON.stringify({
                            PaperInfo: promptData,
                          }),
                        );
                        const deeplink = `raycast://ai-commands/ai-summary-with-mcp-to-craft?arguments=${encodedArgument}`;
                        try {
                          await open(deeplink);
                          await showToast({
                            style: Toast.Style.Success,
                            title: "AI Command opened",
                            message: "Processing with MCP servers",
                          });
                        } catch (error) {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to open AI Command",
                            message: "Make sure the command exists",
                          });
                        }
                      }}
                    />
                    {existingId ? (
                      spaceId ? (
                        <Action.Open
                          title="Open Existing in Craft"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          target={existingDeepLink}
                        />
                      ) : existingWebUrl ? (
                        <Action.OpenInBrowser
                          title="Open Existing in Craft"
                          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          url={existingWebUrl}
                        />
                      ) : null
                    ) : null}
                    <Action.CopyToClipboard
                      title="Copy Item Key"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                      content={displayItem.key}
                    />
                    {existingId ? (
                      <Action
                        title="Delete from Craft"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={() =>
                          void deleteExistingItem(displayItem, existingId)
                        }
                      />
                    ) : null}
                    {results.length > 1 ? (
                      <Action
                        title="Sync All Results"
                        icon={Icon.Upload}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                        onAction={() => void syncItems(results)}
                      />
                    ) : null}
                    <Action.OpenInBrowser
                      title="Open in Zotero"
                      shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}
                      url={`zotero://select/library/items/${displayItem.key}`}
                    />
                    {displayItem.data.url || displayItem.data.DOI ? (
                      <Action.OpenInBrowser
                        title="Open URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                        url={displayItem.data.url || displayItem.data.DOI || ""}
                      />
                    ) : null}
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

function requirePreference(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseCount(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function extractCitationKeyFromExtra(extra?: string): string | null {
  if (!extra) return null;
  const lines = extra.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^citation\s*key\s*:\s*(.+)$/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function statusIcon(status: SyncStatus): Icon {
  switch (status) {
    case "created":
      return Icon.Checkmark;
    case "updated":
      return Icon.Pencil;
    case "deleted":
      return Icon.Trash;
    case "skipped":
      return Icon.Minus;
    case "error":
      return Icon.XMarkCircle;
    default:
      return Icon.Circle;
  }
}

function buildSubtitle(item: ZoteroItem): string {
  const authors = ZoteroClient.formatAuthors(item.data.creators);
  const year = ZoteroClient.extractYear(item.data.date);
  const journal = getJournalPublisher(item);
  return [authors, year, journal].filter(Boolean).join(" · ");
}

function buildItemDetail(item: ZoteroItem): string {
  const title = item.data.title || "Untitled";
  const zoteroUri = `zotero://select/library/items/${item.key}`;
  const hasCreators = (item.data.creators || []).length > 0;
  const authors = hasCreators
    ? ZoteroClient.formatAuthors(item.data.creators)
    : "";
  const publication = getJournalPublisher(item);
  const year = ZoteroClient.extractYear(item.data.date);
  const doi = formatDoi(item.data.DOI);
  const doiUrl = doi ? `https://doi.org/${doi}` : "";
  const abstract = item.data.abstractNote || "";
  const tags = (item.data.tags || [])
    .map((tag) => tag.tag)
    .filter(Boolean)
    .join(", ");

  const lines = [
    `## ${title}`,
    "",
    "---",
    "",
    authors ? `**Authors:** ${authors}` : "",
    publication ? `**Publication:** ${publication}` : "",
    year ? `**Publication Year:** ${year}` : "",
    doiUrl ? `**DOI:** [${doi}](${doiUrl})` : "",
    `**Zotero URI:** ${zoteroUri}`,
    !doiUrl && item.data.url
      ? `**URL:** [${item.data.url}](${item.data.url})`
      : "",
    abstract ? `**Abstract:** ${abstract}` : "",
    tags ? `**Tags:** ${tags}` : "",
  ];

  return lines.filter(Boolean).join("\n\n");
}

function generateMCPPromptData(
  item: ZoteroItem,
  options?: {
    zoteroUri?: string;
  },
): string {
  const itemKey = item.key;
  const zoteroUri =
    options?.zoteroUri || `zotero://select/library/items/${itemKey}`;

  return `Zotero Item Key: ${itemKey}
Zotero URI: ${zoteroUri}`;
}

function buildErrorMarkdown(log: SyncLog): string {
  const errorDetails = log.errorDetails
    ? `\n\n\`\`\`\n${log.errorDetails}\n\`\`\`\n`
    : "";
  const payload = log.payload ? `\n\n\`\`\`json\n${log.payload}\n\`\`\`\n` : "";
  return `# ${log.title}\n\n## Error Details${errorDetails}\n\n## Payload${payload}`;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function formatDoi(doi?: string): string {
  if (!doi) return "";
  if (doi.includes(" ")) return doi.split(" ").pop() || "";
  if (doi.includes("http://") || doi.includes("https://")) {
    const parts = doi.split("/");
    return parts.slice(3).join("/");
  }
  return doi;
}

function buildCraftDeepLink(blockId: string, spaceId?: string): string {
  if (spaceId) {
    return `craftdocs://open?spaceId=${encodeURIComponent(spaceId)}&blockId=${encodeURIComponent(blockId)}`;
  }
  return `craftdocs://open?blockId=${encodeURIComponent(blockId)}`;
}

function buildCraftWebUrl(blockId: string, apiBase: string): string | null {
  const match = apiBase.match(/connect\.craft\.do\/links\/([^/]+)/);
  if (!match?.[1]) return null;
  return `https://www.craft.do/s/${match[1]}?blockId=${encodeURIComponent(blockId)}`;
}

function CollectionDropdown({
  collections,
  selected,
  onSelection,
}: {
  collections: ZoteroCollection[];
  selected: string;
  onSelection: (newValue: string) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Select Collection"
      value={selected}
      onChange={onSelection}
    >
      <List.Dropdown.Item key="all" title="All" value="all" />
      {collections.map((collection) => (
        <List.Dropdown.Item
          key={collection.key}
          title={collection.name}
          value={collection.key}
        />
      ))}
    </List.Dropdown>
  );
}

const ITEM_TYPE_ICONS: Record<string, string> = {
  artwork: "artwork.svg",
  audiorecording: "audio-recording.svg",
  bill: "bill.svg",
  blogpost: "blog-post.svg",
  book: "book.svg",
  booksection: "book-section.svg",
  case: "case.svg",
  computerprogram: "computer-program.svg",
  conferencepaper: "conference-paper.svg",
  dictionaryentry: "dictionary-entry.svg",
  document: "document.svg",
  email: "email.svg",
  encyclopediaarticle: "encyclopedia-article.svg",
  film: "film.svg",
  forumpost: "forum-post.svg",
  hearing: "hearing.svg",
  instantmessage: "instant-message.svg",
  interview: "interview.svg",
  journalarticle: "journal-article.svg",
  letter: "letter.svg",
  magazinearticle: "magazine-article.svg",
  manuscript: "manuscript.svg",
  map: "map.svg",
  newspaperarticle: "newspaper-article.svg",
  patent: "patent.svg",
  preprint: "preprint.svg",
  thesis: "thesis.svg",
};

function getItemIcon(itemType?: string): string {
  const normalized = (itemType || "").toLowerCase();
  return ITEM_TYPE_ICONS[normalized] || "document.svg";
}
async function buildNotesBlocks(
  item: ZoteroItem,
): Promise<Array<{ type: "text"; markdown: string }>> {
  let notes: string[] = [];
  if (item.data.notes) {
    notes = item.data.notes;
  }
  if (notes.length === 0) return [];
  const items = notes.flatMap((note) => extractNoteParagraphs(note));
  return [
    { type: "text" as const, markdown: "## Notes" },
    ...items.map((note) => ({ type: "text" as const, markdown: note })),
  ];
}

function extractNoteParagraphs(note: string): string[] {
  if (!note) return [];
  const normalized = note.replace(/\r\n/g, "\n");
  const blocks: string[] = [];
  const blockRegex = /<(h1|h2|h3|p)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = blockRegex.exec(normalized))) {
    const tag = match[1].toLowerCase();
    const raw = match[2].replace(/<br\s*\/?>/gi, "\n");
    const citationAware = replaceCitationSpans(raw);
    const text = normalizeCitationSpacing(
      collapseWhitespace(decodeHtmlEntities(stripHtml(citationAware))),
    );
    if (!text) continue;
    if (tag === "h1") {
      blocks.push(`### ${text}`);
    } else if (tag === "h2") {
      blocks.push(`#### ${text}`);
    } else if (tag === "h3") {
      blocks.push(`##### ${text}`);
    } else {
      blocks.push(text);
    }
  }

  if (blocks.length > 0) return blocks;

  const fallback = normalizeCitationSpacing(
    collapseWhitespace(
      decodeHtmlEntities(stripHtml(replaceCitationSpans(normalized))),
    ),
  );
  if (!fallback) return [];
  return fallback
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function replaceCitationSpans(input: string): string {
  return input.replace(
    /<span[^>]*class=["']citation["'][^>]*data-citation=["']([^"']+)["'][^>]*>([\s\S]*?)<\/span>/gi,
    (_, _data: string, inner: string) => {
      const text = collapseWhitespace(decodeHtmlEntities(stripHtml(inner)));
      const cleaned = normalizeCitationSpacing(text);
      return cleaned;
    },
  );
}

function normalizeCitationSpacing(input: string): string {
  return input.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function collapseWhitespace(input: string): string {
  return input
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function applyReadingDate(
  properties: Record<string, unknown>,
  schemaIndex: Map<string, CraftCollectionSchemaProperty>,
  dailyNoteIdRef: { current: string | null },
  craftClient: CraftClient | null,
  addLog: (log: SyncLog) => void,
  warningRef: { current: boolean },
) {
  const readingDateProp = getReadingDateProperty(schemaIndex);
  if (!readingDateProp) return;

  const dateString = getLocalDateString();
  const lowerType = readingDateProp.type.toLowerCase();
  const expectsDate = lowerType.includes("date");
  const expectsObject =
    lowerType.includes("block") ||
    lowerType.includes("link") ||
    lowerType.includes("reference") ||
    lowerType.includes("relation") ||
    lowerType.includes("object");

  if (expectsDate || !expectsObject) {
    properties[readingDateProp.key] = dateString;
    return;
  }

  if (!craftClient) {
    if (!warningRef.current) {
      addLog({
        title: "Reading Date",
        status: "skipped",
        details: "Craft API not configured; skipping Reading Date link.",
      });
      warningRef.current = true;
    }
    return;
  }

  try {
    let dailyNoteId = dailyNoteIdRef.current;
    if (!dailyNoteId) {
      dailyNoteId = await craftClient.getDailyNoteId(dateString);
      dailyNoteIdRef.current = dailyNoteId;
    }

    properties[readingDateProp.key] = {
      blockId: dailyNoteId,
      title: formatDateTitle(dateString),
    };
  } catch (error) {
    if (!warningRef.current) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog({
        title: "Reading Date",
        status: "skipped",
        details: `Failed to resolve daily note; skipping Reading Date link. ${message}`,
      });
      warningRef.current = true;
    }
  }
}

async function resolveCitationKey(
  item: ZoteroItem,
  cache: Map<string, string>,
): Promise<string | null> {
  const cached = cache.get(item.key);
  if (cached) return cached;

  const extraCitationKey = extractCitationKeyFromExtra(item.data?.extra);
  if (extraCitationKey) {
    cache.set(item.key, extraCitationKey);
    return extraCitationKey;
  }

  return null;
}

function formatCollections(
  collections: ZoteroCollection[],
): ZoteroCollection[] {
  const collectionMap = new Map(
    collections.map((collection) => [collection.key, collection]),
  );
  const formatName = (collection: ZoteroCollection): string => {
    if (!collection.parentCollection) return collection.name;
    const parent = collectionMap.get(collection.parentCollection);
    if (!parent) return collection.name;
    return `${formatName(parent)} / ${collection.name}`;
  };

  return collections
    .map((collection) => ({
      ...collection,
      name: formatName(collection),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
