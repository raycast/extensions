import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences, Keyboard } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { BuildExtension } from "./components/build-extension";
import { LinkActions, OpenInStoreActions } from "./components/extension-actions";
import { ExtensionDetail } from "./components/extension-detail";
import { getAIStatus } from "./lib/ai";
import { getInstalledIds, StoreExtension, useCatalog } from "./lib/catalog";
import { getLanguage } from "./lib/language";
import { allCategories, browse, BrowseFilter, keywordSearch } from "./lib/search";
import { useSmartSearch } from "./lib/smart-search";
import { useTranslations } from "./lib/translate";

const TRANSLATED_ROWS = 30;

function formatDownloads(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
}

interface Row {
  item: StoreExtension;
  reason?: string;
}

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
function useAnimationFrame(active: boolean): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setFrame((value) => value + 1), 120);
    return () => clearInterval(timer);
  }, [active]);
  return frame;
}

export default function Command() {
  const lang = useMemo(getLanguage, []);
  const ai = useMemo(getAIStatus, []);
  const catalog = useCatalog();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<BrowseFilter>("popular");
  const [installed, setInstalled] = useState(getInstalledIds);
  // Re-read installed extensions when the catalog reloads or the user searches or browses again,
  // so extensions installed from the Store meanwhile get their badge.
  useEffect(() => setInstalled(getInstalledIds()), [catalog.items, filter, searchText]);
  const categories = useMemo(() => allCategories(catalog.items), [catalog.items]);

  const query = searchText.trim();
  const smart = useSmartSearch(query, catalog.items, lang);

  // Instant keyword results shown while the smart search is still thinking.
  const instant = useMemo<Row[]>(
    () => (query ? keywordSearch(catalog.items, [query], 30).map((r) => ({ item: r.item })) : []),
    [query, catalog.items],
  );
  const browsed = useMemo<Row[]>(
    () => (query ? [] : browse(catalog.items, filter, installed).map((item) => ({ item }))),
    [query, filter, catalog.items, installed],
  );

  // With AI, its suggestions get their own section above the classic keyword results.
  const aiMode = Boolean(query) && ai.available;
  const aiThinking = aiMode && smart.isLoading;
  const aiRows: Row[] = aiMode && !smart.isLoading && smart.isSmart ? smart.results : [];
  // Without AI, or when the AI failed, the smart search returns translated keyword results.
  const keywordFallback = !smart.isLoading && !smart.isSmart && (!aiMode || Boolean(smart.error));
  const keywordRows: Row[] = !query
    ? browsed
    : keywordFallback
      ? smart.results
      : instant.filter((row) => !aiRows.some((r) => r.item.id === row.item.id));
  const frame = useAnimationFrame(aiThinking);

  const visible = [...aiRows, ...keywordRows].slice(0, TRANSLATED_ROWS);
  const texts = useMemo(
    () => visible.map((row) => ({ key: row.item.id, text: row.item.description })),
    [visible.map((row) => `${row.item.id}\u0000${row.item.description}`).join("\u0001")],
  );
  const { translations, isTranslating } = useTranslations(texts, lang);

  const closest = (aiRows.length ? aiRows : keywordRows).slice(0, 5).map((row) => row.item);
  const aiDone = aiMode && !smart.isLoading && smart.isSmart;
  const nothingFits = Boolean(query) && !smart.isLoading && (aiMode ? smart.verdict === "none" : !keywordRows.length);

  const renderRow = (row: Row, section: string) => {
    const { item } = row;
    const accessories: List.Item.Accessory[] = [];
    if (row.reason) accessories.push({ icon: { source: Icon.Stars, tintColor: Color.Purple }, tooltip: row.reason });
    if (installed.has(item.id)) accessories.push({ tag: { value: "Installed", color: Color.Green } });
    accessories.push({ text: formatDownloads(item.downloads), icon: Icon.Download, tooltip: "Downloads" });

    return (
      <List.Item
        key={`${section}-${item.id}`}
        title={item.title}
        subtitle={translations[item.id] ?? item.description}
        icon={item.icon ? { source: { light: item.icon, dark: item.iconDark ?? item.icon } } : Icon.Box}
        keywords={[item.name]}
        accessories={accessories}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              icon={Icon.Sidebar}
              target={
                <ExtensionDetail
                  item={item}
                  lang={lang}
                  installed={installed.has(item.id)}
                  reason={row.reason}
                  query={query}
                />
              }
            />
            <OpenInStoreActions item={item} />
            {query && (
              <Action.Push
                title="Build It with AI"
                icon={Icon.Hammer}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
                target={<BuildExtension query={query} lang={lang} closest={closest} />}
              />
            )}
            <LinkActions item={item} />
            <ActionPanel.Section>
              <Action
                title="Refresh Store Catalog"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={catalog.refresh}
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const buildSection = query ? (
    <List.Section title="Can't Find It?">
      <List.Item
        title={`Build “${query}” with AI`}
        subtitle={nothingFits ? "No extension does this yet" : "Get a plan and a ready-to-use prompt"}
        icon={{ source: Icon.Hammer, tintColor: Color.Orange }}
        actions={
          <ActionPanel>
            <Action.Push
              title="Build It with AI"
              icon={Icon.Hammer}
              target={<BuildExtension query={query} lang={lang} closest={closest} />}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  ) : null;

  const aiSubtitle = aiThinking
    ? undefined
    : smart.verdict === "partial"
      ? "Partial matches"
      : smart.verdict === "none"
        ? "No exact match"
        : aiRows.length
          ? String(aiRows.length)
          : undefined;

  const aiSection = aiMode ? (
    <List.Section title="AI Suggestions" subtitle={aiSubtitle}>
      {/* Raycast hides empty sections, so a single row carries the progress message. */}
      {aiThinking && (
        <List.Item
          title={`${SPINNER[frame % SPINNER.length]} Looking for the best extensions…`}
          icon={{ source: Icon.Stars, tintColor: Color.Purple }}
        />
      )}
      {aiRows.map((row) => renderRow(row, "ai"))}
      {aiDone && !aiRows.length && (
        <List.Item
          title="No extension does this yet"
          subtitle="Build it with AI"
          icon={{ source: Icon.Hammer, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Build It with AI"
                icon={Icon.Hammer}
                target={<BuildExtension query={query} lang={lang} closest={closest} />}
              />
            </ActionPanel>
          }
        />
      )}
    </List.Section>
  ) : null;

  const keywordTitle = !query ? "Extensions" : aiMode ? "Keyword Matches" : "Results";

  return (
    <List
      isLoading={catalog.isLoading || smart.isLoading || isTranslating}
      searchBarPlaceholder={ai.available ? "Describe what you need, in any language…" : "Search extensions by keyword…"}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Browse" storeValue onChange={(value) => setFilter(value as BrowseFilter)}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Most Popular" value="popular" icon={Icon.Star} />
            <List.Dropdown.Item title="Recently Added" value="new" icon={Icon.NewDocument} />
            <List.Dropdown.Item title="Recently Updated" value="updated" icon={Icon.ArrowClockwise} />
            <List.Dropdown.Item title="Installed" value="installed" icon={Icon.CheckCircle} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Categories">
            {categories.map((category) => (
              <List.Dropdown.Item key={category} title={category} value={`category:${category}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {catalog.error && !catalog.items.length && (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Couldn't load the Raycast Store"
          description={catalog.error.message}
        />
      )}
      {nothingFits && !aiMode && buildSection}
      {aiSection}
      {query && !ai.available && (
        <List.Section title="Tip">
          <List.Item
            title="Turn on AI for plain-language search"
            subtitle={ai.reason}
            icon={{ source: Icon.Stars, tintColor: Color.Purple }}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {smart.error && (
        <List.Section title="AI Error">
          <List.Item
            title="Smart search failed, showing keyword results"
            subtitle={smart.error.message}
            icon={{ source: Icon.Warning, tintColor: Color.Red }}
            actions={
              <ActionPanel>
                <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title={keywordTitle} subtitle={keywordRows.length ? String(keywordRows.length) : undefined}>
        {keywordRows.map((row) => renderRow(row, "keyword"))}
      </List.Section>
      {(aiMode || !nothingFits) && buildSection}
    </List>
  );
}
