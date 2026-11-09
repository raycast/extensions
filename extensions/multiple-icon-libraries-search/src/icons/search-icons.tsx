import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  environment,
  Form,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useCaption } from "./caption";
import { hudText, MainAction, mainActionOrder, savedNotice } from "./actions";
import { freeFileName, readCopySvg, safeFileBase, tilePath } from "./catalog-store";
import { useAiKeywords, useCatalog, useLibraryMemory } from "./hooks";
import {
  categoryTitle,
  currentLibrary,
  enabledLibraries,
  iconName,
  LIBRARIES,
  NameFormat,
  otherLibraries,
  searchPlaceholder,
} from "./libraries";
import { aiRank, keywordSearch, normalizePhrase } from "./search";
import {
  ALL,
  browseSections,
  byName,
  categoryOptions,
  COLUMNS,
  firstSelection,
  inFilter,
  limitSections,
  NEW,
  otherLayout,
  PAGE_SIZE,
  Section,
  searchSections,
  tileOf,
  aiAddedTitle,
} from "./sections";
import {
  addSavedKeyword,
  forgetSavedKeywords,
  recordUse,
  sample,
  setSavedKeywords,
  toggleFavorite,
  topUsed,
} from "./stores";
import { strokeOverride, toPreview, withStrokeWidth } from "./svg";
import { IconEntry, LibraryId, TileLayout } from "./types";

/** How long the loading tile shows each shape before the next. */
const SPINNER_FRAME_MS = 400;

interface ItemHandlers {
  library: LibraryId;
  /** The libraries the Libraries setting turns on. */
  libraries: LibraryId[];
  compact: boolean;
  favorites: string[];
  saved: Record<string, string[]>;
  canUseAi: boolean;
  searching: boolean;
  enterOrder: MainAction[];
  nameFormat: NameFormat;
  withLibraryName: boolean;
  strokeWidth?: string;
  /** Records the use; returns the notice when an AI pick's words were saved. */
  onUse: (icon: IconEntry, fromAi: boolean) => string | undefined;
  /** Returns whether the change was saved. */
  onToggleFavorite: (icon: IconEntry) => boolean;
  onSetKeywords: (icon: IconEntry, text: string) => void;
  onForgetKeywords: (icon: IconEntry) => void;
  onSwitchLibrary: (library: LibraryId) => void;
  onSwitchLayout: () => void;
  onRefresh: () => void;
  onAskAi: () => void;
}

const SWITCH_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "l" };

/** ⌘L: straight to the other library when two are on, a menu of the others when more are, nothing when one is. */
function SwitchLibraryAction({ handlers }: { handlers: ItemHandlers }) {
  const others = otherLibraries(handlers.libraries, handlers.library);
  if (others.length === 1) {
    return (
      <Action
        title={`Switch to ${LIBRARIES[others[0]].title}`}
        icon={Icon.Switch}
        shortcut={SWITCH_SHORTCUT}
        onAction={() => handlers.onSwitchLibrary(others[0])}
      />
    );
  }
  if (!others.length) return null;
  return (
    <ActionPanel.Submenu title="Switch Library…" icon={Icon.Switch} shortcut={SWITCH_SHORTCUT}>
      {others.map((id) => (
        <Action key={id} title={LIBRARIES[id].title} onAction={() => handlers.onSwitchLibrary(id)} />
      ))}
    </ActionPanel.Submenu>
  );
}

function LibraryActions({ handlers }: { handlers: ItemHandlers }) {
  return (
    <>
      <SwitchLibraryAction handlers={handlers} />
      <Action
        title={handlers.compact ? "Show Names" : "Hide Names"}
        icon={Icon.Text}
        shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
        onAction={handlers.onSwitchLayout}
      />
      <Action title="Refresh Icons" icon={Icon.ArrowClockwise} onAction={handlers.onRefresh} />
    </>
  );
}

/** The icon as an SVG to copy, paste, or save, at the Stroke Width setting (24 px, or the icon's own box). */
function copySvg(icon: IconEntry, handlers: ItemHandlers): string {
  return withStrokeWidth(readCopySvg(environment.supportPath, handlers.library, icon), handlers.strokeWidth);
}

/** The five main actions, in the Enter Action setting's order. */
function mainActions(icon: IconEntry, handlers: ItemHandlers, fromAi: boolean): Record<MainAction, ReactNode> {
  const name = iconName(handlers.library, icon, handlers.nameFormat, handlers.withLibraryName);
  const hud = (done?: string) => {
    const text = hudText(done, handlers.onUse(icon, fromAi));
    if (text) void showHUD(text);
  };
  const copy = async (content: string, done: string) => {
    await Clipboard.copy(content);
    hud(done);
  };
  return {
    "paste-name": <Action.Paste key="paste-name" title="Paste Name" content={name} onPaste={() => hud()} />,
    "copy-name": (
      <Action key="copy-name" title="Copy Name" icon={Icon.Clipboard} onAction={() => copy(name, "Copied name")} />
    ),
    "paste-svg": (
      // eslint-disable-next-line @raycast/prefer-title-case -- "SVG" is a format name.
      <Action.Paste key="paste-svg" title="Paste SVG" content={copySvg(icon, handlers)} onPaste={() => hud()} />
    ),
    "copy-svg": (
      <Action
        key="copy-svg"
        // eslint-disable-next-line @raycast/prefer-title-case -- "SVG" is a format name.
        title="Copy SVG"
        icon={Icon.CodeBlock}
        onAction={() => copy(copySvg(icon, handlers), "Copied SVG")}
      />
    ),
    "copy-react": (
      <Action
        key="copy-react"
        title="Copy React Code"
        icon={Icon.Code}
        onAction={() =>
          copy(
            LIBRARIES[handlers.library].reactCode(icon, handlers.strokeWidth, copySvg(icon, handlers)),
            "Copied React code",
          )
        }
      />
    ),
  };
}

function IconActions({
  icon,
  section,
  handlers,
  inPreview = false,
}: {
  icon: IconEntry;
  section: Section["kind"];
  handlers: ItemHandlers;
  inPreview?: boolean;
}) {
  const info = LIBRARIES[handlers.library];
  const fromAi = section === "ai";
  const favorite = handlers.favorites.includes(icon.name);
  const actions = mainActions(icon, handlers, fromAi);
  const [first, second, ...rest] = handlers.enterOrder.map((id) => actions[id]);
  const saved = handlers.saved[icon.name] ?? [];
  return (
    <ActionPanel title={icon.name}>
      <ActionPanel.Section>
        {first}
        {second}
        {!inPreview && (
          <Action.Push
            title="Show Preview"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
            target={<IconPreview icon={icon} section={section} handlers={handlers} />}
          />
        )}
        {!inPreview && handlers.canUseAi && handlers.searching && (
          <Action
            title="Show AI Results"
            icon={Icon.Stars}
            shortcut={{ modifiers: [], key: "tab" }}
            onAction={handlers.onAskAi}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {rest}
        <Action
          // eslint-disable-next-line @raycast/prefer-title-case -- "SVG" is a format name.
          title="Save SVG to Downloads"
          icon={Icon.Download}
          onAction={async () => {
            const downloads = join(homedir(), "Downloads");
            const file = freeFileName(icon.name, (name) => existsSync(join(downloads, name)));
            writeFileSync(join(downloads, file), copySvg(icon, handlers));
            const text = hudText(`Saved ${file} to Downloads`, handlers.onUse(icon, fromAi));
            if (text) await showHUD(text);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={() => handlers.onToggleFavorite(icon)}
        />
        <Action.OpenInBrowser title={`Open on ${info.siteName}`} url={info.pageUrl(icon)} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.Push
          title="Edit Keywords"
          icon={Icon.Tag}
          target={<KeywordsForm icon={icon} saved={saved} onSave={(text) => handlers.onSetKeywords(icon, text)} />}
        />
        {saved.length > 0 && (
          <Action title="Forget Keywords" icon={Icon.XMarkCircle} onAction={() => handlers.onForgetKeywords(icon)} />
        )}
        {!inPreview && <LibraryActions handlers={handlers} />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

const IconItem = memo(function IconItem({
  icon,
  section,
  handlers,
}: {
  icon: IconEntry;
  section: Section["kind"];
  handlers: ItemHandlers;
}) {
  const image = {
    source: tilePath(environment.supportPath, handlers.library, icon),
    tintColor: Color.PrimaryText,
  };
  return (
    <Grid.Item
      id={`${handlers.library}:${section}:${icon.name}`}
      content={{ value: image, tooltip: icon.name }}
      title={handlers.compact ? undefined : icon.name}
      actions={<IconActions icon={icon} section={section} handlers={handlers} />}
    />
  );
});

const PREVIEW_SIZE = 192;

/** Writes the large preview drawing and returns its path. One file per look, since Raycast caches images by path. */
function writePreview(icon: IconEntry, handlers: ItemHandlers): string {
  const dark = environment.appearance === "dark";
  const dir = join(environment.supportPath, "preview");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const look = `${handlers.strokeWidth ?? "default"}-${dark ? "dark" : "light"}`;
  const path = join(dir, `${handlers.library}-${safeFileBase(icon.name)}-${look}.svg`);
  writeFileSync(path, toPreview(copySvg(icon, handlers), PREVIEW_SIZE, dark ? "#f2f2f2" : "#1a1a1a"));
  return path;
}

/** One icon, large, with the words that find it and its name in each format. */
function IconPreview({
  icon,
  section,
  handlers: opened,
}: {
  icon: IconEntry;
  section: Section["kind"];
  handlers: ItemHandlers;
}) {
  // A pushed view keeps the handlers it was opened with, so it tracks its own icon's favorite and keywords.
  const [favorite, setFavorite] = useState(opened.favorites.includes(icon.name));
  const [saved, setSaved] = useState(opened.saved[icon.name] ?? []);
  const handlers: ItemHandlers = {
    ...opened,
    favorites: favorite ? [icon.name] : [],
    saved: { [icon.name]: saved },
    onToggleFavorite: (target) => {
      const saved = opened.onToggleFavorite(target);
      if (saved) setFavorite(!favorite);
      return saved;
    },
    onSetKeywords: (target, text) => {
      opened.onSetKeywords(target, text);
      setSaved(setSavedKeywords({}, target.name, text)[target.name] ?? []);
    },
    onForgetKeywords: (target) => {
      opened.onForgetKeywords(target);
      setSaved([]);
    },
  };
  const info = LIBRARIES[handlers.library];
  const path = useMemo(() => writePreview(icon, handlers), [icon, handlers.library, handlers.strokeWidth]);
  const names = [
    { title: "Import Name", value: info.name(icon, "import") },
    { title: "Icon Name", value: info.name(icon, "icon") },
  ];
  return (
    <Detail
      navigationTitle={icon.name}
      markdown={`![${icon.name}](${encodeURI(`file://${path}`)})`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Library" text={info.title} />
          {icon.categories.length > 0 && (
            <Detail.Metadata.Label title="Category" text={icon.categories.map(categoryTitle).join(", ")} />
          )}
          {saved.length > 0 && (
            <Detail.Metadata.TagList title="Your Keywords">
              {saved.map((phrase) => (
                <Detail.Metadata.TagList.Item key={phrase} text={phrase} color={Color.Purple} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {icon.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {icon.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {names.map((entry) => (
            <Detail.Metadata.Label key={entry.title} title={entry.title} text={entry.value} />
          ))}
        </Detail.Metadata>
      }
      actions={<IconActions icon={icon} section={section} handlers={handlers} inPreview />}
    />
  );
}

/** Your own words for an icon, one per line. They find it the way AI picks do, without AI. */
function KeywordsForm({ icon, saved, onSave }: { icon: IconEntry; saved: string[]; onSave: (text: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Keywords for ${icon.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Keywords"
            icon={Icon.Check}
            onSubmit={({ keywords }: { keywords: string }) => {
              onSave(keywords);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="keywords"
        title="Keywords"
        info="One per line. Each one finds this icon."
        defaultValue={saved.join("\n")}
      />
    </Form>
  );
}

export default function Command() {
  const libraries = enabledLibraries(getPreferenceValues<Preferences.SearchIcons>());
  return libraries.length ? <SearchIcons libraries={libraries} /> : <NoLibraries />;
}

/** Every library is turned off in settings, which can't stop it, so the command asks for one. */
function NoLibraries() {
  return (
    <Grid>
      <Grid.EmptyView
        icon={Icon.AppWindowGrid3x3}
        title="Turn on an icon library"
        description="All icon libraries are off in this command's settings."
        actions={
          <ActionPanel>
            <Action title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function IconGrid({
  sections,
  library,
  compact,
  ...props
}: Grid.Props & {
  sections: Section[];
  library: LibraryId;
  compact: boolean;
}) {
  return <Grid {...props} {...useCaption({ sections, library, compact })} />;
}

function SearchIcons({ libraries }: { libraries: LibraryId[] }) {
  const prefs = getPreferenceValues<Preferences.SearchIcons>();
  const { saveAiKeywords } = prefs;
  const [layout, setLayout] = useCachedState<TileLayout>("tileLayout", "compact");
  const compact = layout === "compact";
  const columns = COLUMNS[layout];
  // The Default Library setting picks the library each time the command opens; "Last Used" keeps the last one.
  const [lastLibrary, setLastLibrary] = useCachedState<LibraryId>("library", "lucide");
  const [chosenLibrary, setChosenLibrary] = useState<LibraryId | undefined>(
    prefs.defaultLibrary === "last" ? undefined : prefs.defaultLibrary,
  );
  // A library turned off in settings is skipped, so `library` is always one that is on.
  const library = currentLibrary([chosenLibrary, lastLibrary], libraries) ?? libraries[0];
  const setLibrary = (next: LibraryId) => {
    setChosenLibrary(next);
    setLastLibrary(next);
  };
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(ALL);
  const { catalog, items, isLoading, error, refresh } = useCatalog(library);
  const memory = useLibraryMemory(library);
  const icons = catalog?.icons ?? [];
  const newNames = useMemo(() => new Set(catalog?.newNames ?? []), [catalog]);

  const filtered = useMemo(
    () => (filter === ALL ? items : items.filter((item) => inFilter(item.icon, filter, newNames))),
    [items, filter, newNames],
  );
  const results = useMemo(
    () => keywordSearch(filtered, searchText, memory.saved),
    [filtered, searchText, memory.saved],
  );
  const { canUseAi, ai, aiPending, requestNow } = useAiKeywords(
    searchText,
    results.length,
    prefs.autoAi,
    prefs.aiModel,
  );
  const aiResults = useMemo(() => (ai?.status === "done" ? aiRank(filtered, ai.keywords) : undefined), [ai, filtered]);
  const aiLoading = ai?.status === "loading";

  // While AI works, AI Results holds one loading tile that cycles through the library's own shape icons.
  const spinnerIcons = useMemo(() => byName(icons, LIBRARIES[library].spinner), [icons, library]);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  useEffect(() => {
    if (!aiPending) return;
    const timer = setInterval(() => setSpinnerFrame((frame) => frame + 1), SPINNER_FRAME_MS);
    return () => clearInterval(timer);
  }, [aiPending]);

  // Tab's AI row can sit below the visible tiles, so a toast confirms Tab worked. Errors show as a
  // toast when keyword matches are on screen; otherwise the empty view explains them.
  const tabLoading = aiLoading && ai?.trigger === "tab";
  useEffect(() => {
    if (!tabLoading) return;
    const toast = showToast({ style: Toast.Style.Animated, title: "Asking Raycast AI…" });
    return () => void toast.then((shown) => shown.hide());
  }, [tabLoading, ai?.query]);
  const aiFailed = ai?.status === "error" && results.length > 0;
  useEffect(() => {
    if (aiFailed) void showToast({ style: Toast.Style.Failure, title: ai?.error ?? "Asking Raycast AI failed" });
  }, [aiFailed, ai?.query]);

  // A fresh random row of New icons each time the command opens or the library changes.
  // Kept as names, so a refresh that moves the drawings shows the new files.
  const newSampleNames = useMemo(() => sample([...newNames], columns), [library, newNames.size, columns]);
  const newSample = useMemo(() => byName(icons, newSampleNames), [icons, newSampleNames]);

  // Favorites lead the start view when the Show Favorites setting is on, and come first among search results.
  const favoriteNames = useMemo(() => new Set(memory.favorites), [memory.favorites]);
  const showFavorites = prefs.showFavorites !== false;
  const sections = useMemo(() => {
    if (searchText.trim()) {
      return searchSections(results, aiResults, aiPending && spinnerIcons.length ? 1 : 0, favoriteNames);
    }
    const favorites = showFavorites ? byName(icons, memory.favorites) : [];
    const shownFavorites = new Set(favorites.map((icon) => icon.name));
    const frequent = byName(icons, topUsed(memory.uses, columns, Date.now(), shownFavorites));
    return browseSections({ icons, filter, newNames, frequent, newSample, favorites });
  }, [
    searchText,
    results,
    aiResults,
    aiPending,
    icons,
    filter,
    newNames,
    favoriteNames,
    showFavorites,
    memory.favorites,
    memory.uses,
    newSample,
    columns,
  ]);

  // One page of tiles at a time; a new search, filter, or library starts again at the first page.
  const viewKey = `${library}\n${filter}\n${searchText}`;
  const [page, setPage] = useState({ key: viewKey, limit: PAGE_SIZE });
  const limit = page.key === viewKey ? page.limit : PAGE_SIZE;
  const shown = useMemo(() => limitSections(sections, limit), [sections, limit]);

  // Tab's answer can come back instantly from the cache and land below the visible tiles, so a
  // toast always reports what it added.
  const aiAdded = sections.find((section) => section.kind === "ai")?.icons.length ?? 0;
  useEffect(() => {
    if (ai?.trigger === "tab" && ai.status === "done" && results.length)
      void showToast({ style: Toast.Style.Success, title: aiAddedTitle(aiAdded) });
  }, [ai]);
  const firstId = firstSelection(shown.sections, searchText, filter);
  // Adding or removing a favorite during a search moves the tile between Favorites and the other
  // results, so the highlight follows it. A new search, filter, or library starts again at the first tile.
  const viewKeyRef = useRef(viewKey);
  viewKeyRef.current = viewKey;
  const [follow, setFollow] = useState<{ key: string; name: string }>();
  const followId = searchText.trim() && follow?.key === viewKey ? tileOf(shown.sections, follow.name) : undefined;
  const selectedId = followId ?? firstId;

  const enterOrder = useMemo(() => mainActionOrder(prefs.enterAction), [prefs.enterAction]);
  const handlers: ItemHandlers = useMemo(
    () => ({
      library,
      libraries,
      compact,
      favorites: memory.favorites,
      saved: memory.saved,
      canUseAi,
      searching: Boolean(searchText.trim()),
      enterOrder,
      nameFormat: prefs.nameFormat,
      withLibraryName: prefs.includeLibraryName,
      strokeWidth: LIBRARIES[library].filled ? undefined : strokeOverride(prefs.strokeWidth),
      onUse: (icon, fromAi) => {
        memory.setUses(recordUse(memory.uses, icon.name, Date.now()));
        if (!fromAi || !saveAiKeywords) return undefined;
        const next = addSavedKeyword(memory.saved, icon.name, searchText);
        if (next === memory.saved) return undefined;
        memory.setSaved(next);
        return savedNotice(normalizePhrase(searchText), icon.name);
      },
      onToggleFavorite: (icon) => {
        const next = memory.updateFavorites((favorites) => toggleFavorite(favorites, icon.name));
        if (!next) return false;
        setFollow({ key: viewKeyRef.current, name: icon.name });
        const added = next.includes(icon.name);
        void showToast({
          style: Toast.Style.Success,
          title: added ? "Added to Favorites" : "Removed from Favorites",
          message: added ? "Shows first when it matches a search" : undefined,
        });
        return true;
      },
      onSetKeywords: (icon, text) => {
        memory.setSaved(setSavedKeywords(memory.saved, icon.name, text));
        void showToast({ style: Toast.Style.Success, title: "Keywords saved" });
      },
      onForgetKeywords: (icon) => memory.setSaved(forgetSavedKeywords(memory.saved, icon.name)),
      onSwitchLibrary: (next) => {
        setFilter(ALL);
        setLibrary(next);
      },
      onSwitchLayout: () => setLayout(otherLayout(layout)),
      onRefresh: () => void refresh(),
      onAskAi: requestNow,
    }),
    [
      library,
      libraries,
      compact,
      layout,
      memory,
      canUseAi,
      searchText,
      saveAiKeywords,
      refresh,
      requestNow,
      enterOrder,
      prefs,
    ],
  );

  const options = useMemo(() => categoryOptions(icons), [icons]);
  const emptyActions = (
    <ActionPanel>
      {canUseAi && searchText.trim() && <Action title="Show AI Results" icon={Icon.Stars} onAction={requestNow} />}
      <LibraryActions handlers={handlers} />
    </ActionPanel>
  );

  return (
    <IconGrid
      sections={shown.sections}
      library={library}
      compact={compact}
      columns={columns}
      inset={Grid.Inset.Small}
      selectedItemId={selectedId ? `${library}:${selectedId}` : undefined}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchPlaceholder(library, canUseAi)}
      isLoading={isLoading || !memory.loaded || ai?.status === "loading"}
      searchBarAccessory={
        <Grid.Dropdown key={library} tooltip="Category" value={filter} onChange={setFilter}>
          <Grid.Dropdown.Item title="All" value={ALL} icon={Icon.AppWindowGrid3x3} />
          <Grid.Dropdown.Item title="New" value={NEW} icon={Icon.Stars} />
          <Grid.Dropdown.Section title="Categories">
            {options.map((option) => (
              <Grid.Dropdown.Item key={option.id} title={option.title} value={option.id} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      actions={emptyActions}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: shown.hasMore,
        onLoadMore: () => setPage({ key: viewKey, limit: limit + PAGE_SIZE }),
      }}
    >
      {shown.sections.map((section) => (
        <Grid.Section
          key={`${section.kind}:${section.title}`}
          title={section.title || undefined}
          subtitle={section.kind === "ai" && section.icons.length ? String(section.icons.length) : undefined}
        >
          {section.icons.map((icon) => (
            <IconItem key={`${section.kind}:${icon.name}`} icon={icon} section={section.kind} handlers={handlers} />
          ))}
          {Array.from({ length: section.placeholders ?? 0 }, (_, index) => (
            <Grid.Item
              key={`placeholder:${index}`}
              id={`placeholder:${index}`}
              content={{
                source: tilePath(
                  environment.supportPath,
                  library,
                  spinnerIcons[(spinnerFrame + index) % spinnerIcons.length],
                ),
                tintColor: Color.SecondaryText,
              }}
              actions={emptyActions}
            />
          ))}
        </Grid.Section>
      ))}
      <Grid.EmptyView
        icon={Icon.MagnifyingGlass}
        title={emptyTitle(Boolean(catalog), error)}
        description={ai?.status === "error" ? ai.error : error}
        actions={emptyActions}
      />
    </IconGrid>
  );
}

function emptyTitle(hasCatalog: boolean, error?: string): string {
  if (!hasCatalog) return error ? "Couldn't download icons" : "Downloading icons…";
  return "No matching icons";
}
