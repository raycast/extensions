import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  List,
  Toast,
  environment,
  getPreferenceValues,
  showInFinder,
  showToast,
} from "@raycast/api";
import {
  beginSignIn,
  getCachedAccess,
  getSessionToken,
  refreshAccess,
  signOut,
} from "./auth";
import { IconSearchApiError, formatIconifySet, searchIcons } from "./api";
import {
  API_BASE,
  FAVORITES_KEY,
  MAX_FAVORITE_ICONS,
  MAX_RECENT_ICONS,
  NAMED_LIBRARIES,
  OUTPUT_FORMAT_LABELS,
  PAGE_SIZE,
  RECENT_KEY,
  SEARCH_STYLE_LABELS,
  SEARCHABLE_ICON_COUNT,
  STARTER_CACHE_KEY,
  STARTER_CACHE_TIME_KEY,
  STARTER_CACHE_TTL_MS,
} from "./constants";
import {
  createSnippet,
  customizeSvgMarkup,
  fetchSvgMarkup,
  getCustomizedSvgUrl,
  normalizeIconColor,
  normalizeIconSize,
} from "./snippets";
import { readIconList, readJson, writeJson } from "./storage";
import type {
  ExtensionAccess,
  IconCustomization,
  IconSearchIcon,
  OutputFormat,
  Preferences,
  SearchStyle,
} from "./types";

type SessionState = {
  token: string;
  access?: ExtensionAccess;
};

type FileClipboardMode = "copy" | "paste";

type ColorChoice = "currentColor" | "custom" | `#${string}`;

const DEFAULT_CUSTOMIZATION: IconCustomization = {
  size: 24,
  color: "currentColor",
};
const LIST_THUMBNAIL_CUSTOMIZATION: IconCustomization = {
  size: 32,
  color: "currentColor",
};
const LIST_PREVIEW_CUSTOMIZATION: IconCustomization = {
  size: 160,
  color: "currentColor",
};
const SIZE_OPTIONS = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256] as const;
const QUICK_SIZE_OPTIONS = [16, 24, 32, 48, 64, 96] as const;
const COLOR_OPTIONS: Array<{
  value: ColorChoice;
  title: string;
  icon?: { source: Icon; tintColor: string };
}> = [
  { value: "currentColor", title: "Original / Current Color" },
  {
    value: "#111827",
    title: "Ink",
    icon: { source: Icon.Circle, tintColor: "#111827" },
  },
  {
    value: "#2563EB",
    title: "Blue",
    icon: { source: Icon.Circle, tintColor: "#2563EB" },
  },
  {
    value: "#16A34A",
    title: "Green",
    icon: { source: Icon.Circle, tintColor: "#16A34A" },
  },
  {
    value: "#DC2626",
    title: "Red",
    icon: { source: Icon.Circle, tintColor: "#DC2626" },
  },
  {
    value: "#9333EA",
    title: "Purple",
    icon: { source: Icon.Circle, tintColor: "#9333EA" },
  },
  { value: "custom", title: "Custom Hex Color" },
];

const LOCAL_PREVIEW_LIBRARIES = new Set([
  "bootstrap-icons",
  "patternfly-icons",
]);
const STARTER_LIBRARY_ROTATION = [
  "lucide-icons",
  "heroicons",
  "tabler-icons",
  "phosphor-icons",
] as const;
const BUILT_IN_STARTER_ICONS: IconSearchIcon[] = [
  createBuiltInStarterIcon({
    library: "lucide-icons",
    libraryName: "Lucide Icons",
    packageName: "lucide-react",
    prefix: "lucide",
    name: "home",
    displayName: "Home",
    reactImport: "import { Home } from 'lucide-react';",
    reactUsage: "<Home size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "lucide-icons",
    libraryName: "Lucide Icons",
    packageName: "lucide-react",
    prefix: "lucide",
    name: "search",
    displayName: "Search",
    reactImport: "import { Search } from 'lucide-react';",
    reactUsage: "<Search size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "lucide-icons",
    libraryName: "Lucide Icons",
    packageName: "lucide-react",
    prefix: "lucide",
    name: "settings",
    displayName: "Settings",
    reactImport: "import { Settings } from 'lucide-react';",
    reactUsage: "<Settings size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "heroicons",
    libraryName: "Heroicons",
    packageName: "@heroicons/react",
    prefix: "heroicons",
    name: "home",
    displayName: "Home",
    reactImport: "import { HomeIcon } from '@heroicons/react/24/outline';",
    reactUsage: '<HomeIcon className="size-6" />',
  }),
  createBuiltInStarterIcon({
    library: "heroicons",
    libraryName: "Heroicons",
    packageName: "@heroicons/react",
    prefix: "heroicons",
    name: "magnifying-glass",
    displayName: "Magnifying Glass",
    reactImport:
      "import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';",
    reactUsage: '<MagnifyingGlassIcon className="size-6" />',
  }),
  createBuiltInStarterIcon({
    library: "heroicons",
    libraryName: "Heroicons",
    packageName: "@heroicons/react",
    prefix: "heroicons",
    name: "cog-6-tooth",
    displayName: "Cog",
    reactImport: "import { Cog6ToothIcon } from '@heroicons/react/24/outline';",
    reactUsage: '<Cog6ToothIcon className="size-6" />',
  }),
  createBuiltInStarterIcon({
    library: "tabler-icons",
    libraryName: "Tabler Icons",
    packageName: "@tabler/icons-react",
    prefix: "tabler",
    name: "home",
    displayName: "Home",
    reactImport: "import { IconHome } from '@tabler/icons-react';",
    reactUsage: "<IconHome size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "tabler-icons",
    libraryName: "Tabler Icons",
    packageName: "@tabler/icons-react",
    prefix: "tabler",
    name: "search",
    displayName: "Search",
    reactImport: "import { IconSearch } from '@tabler/icons-react';",
    reactUsage: "<IconSearch size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "tabler-icons",
    libraryName: "Tabler Icons",
    packageName: "@tabler/icons-react",
    prefix: "tabler",
    name: "settings",
    displayName: "Settings",
    reactImport: "import { IconSettings } from '@tabler/icons-react';",
    reactUsage: "<IconSettings size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "phosphor-icons",
    libraryName: "Phosphor Icons",
    packageName: "@phosphor-icons/react",
    prefix: "ph",
    name: "house",
    displayName: "House",
    reactImport: "import { House } from '@phosphor-icons/react';",
    reactUsage: "<House size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "phosphor-icons",
    libraryName: "Phosphor Icons",
    packageName: "@phosphor-icons/react",
    prefix: "ph",
    name: "magnifying-glass",
    displayName: "Magnifying Glass",
    reactImport: "import { MagnifyingGlass } from '@phosphor-icons/react';",
    reactUsage: "<MagnifyingGlass size={24} />",
  }),
  createBuiltInStarterIcon({
    library: "phosphor-icons",
    libraryName: "Phosphor Icons",
    packageName: "@phosphor-icons/react",
    prefix: "ph",
    name: "gear",
    displayName: "Gear",
    reactImport: "import { Gear } from '@phosphor-icons/react';",
    reactUsage: "<Gear size={24} />",
  }),
];

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const defaultFormat = normalizeOutputFormat(preferences.defaultFormat);
  const [session, setSession] = useState<SessionState>({ token: "" });
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState("all");
  const [style, setStyle] = useState<SearchStyle>(
    normalizeSearchStyle(preferences.defaultStyle),
  );
  const [legalOnly, setLegalOnly] = useState(preferences.legalOnly !== false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(defaultFormat);
  const [quickSize, setQuickSize] = useState(DEFAULT_CUSTOMIZATION.size);
  const [quickColor, setQuickColor] = useState(DEFAULT_CUSTOMIZATION.color);
  const [icons, setIcons] = useState<IconSearchIcon[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [iconifySets, setIconifySets] = useState<string[]>([]);
  const [recent, setRecent] = useState<IconSearchIcon[]>([]);
  const [favorites, setFavorites] = useState<IconSearchIcon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const searchAbortRef = useRef<AbortController | null>(null);
  const iconCountRef = useRef(0);

  const classes = (preferences.tailwindClasses || "w-5 h-5").trim();
  const customization = useMemo<IconCustomization>(
    () => ({ size: quickSize, color: quickColor }),
    [quickColor, quickSize],
  );
  const hasMore = Boolean(session.token && page < totalPages && !isLoadingMore);
  const favoriteIds = useMemo(
    () => new Set(favorites.map((icon) => icon.id)),
    [favorites],
  );
  const showingStarterSections = Boolean(
    session.token && !query.trim() && library === "all",
  );

  useEffect(() => {
    iconCountRef.current = icons.length;
  }, [icons.length]);

  const loadSession = useCallback(async () => {
    const [
      token,
      cachedAccess,
      storedRecent,
      storedFavorites,
      cachedStarter,
      starterCachedAt,
    ] = await Promise.all([
      getSessionToken(),
      getCachedAccess(),
      readIconList(RECENT_KEY),
      readIconList(FAVORITES_KEY),
      readIconList(STARTER_CACHE_KEY),
      readJson<number>(STARTER_CACHE_TIME_KEY, 0),
    ]);
    setSession({ token, access: cachedAccess });
    setRecent(storedRecent);
    setFavorites(storedFavorites);

    const hasFreshStarterCache =
      token &&
      style === "all" &&
      legalOnly &&
      cachedStarter.length > 0 &&
      Date.now() - starterCachedAt < STARTER_CACHE_TTL_MS;
    const initialStarterIcons = hasFreshStarterCache
      ? cachedStarter
      : token
        ? BUILT_IN_STARTER_ICONS
        : [];
    if (initialStarterIcons.length > 0) {
      iconCountRef.current = initialStarterIcons.length;
      setIcons(initialStarterIcons);
      setPage(1);
      setTotalPages(1);
    }
    setIsLoading(false);

    if (token) {
      void refreshAccess().then((nextSession) => {
        setSession((current) =>
          current.token === token ? nextSession : current,
        );
      });
    }
  }, [legalOnly, style]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(timeout);
  }, [loadSession]);

  const clearAuthenticatedState = useCallback(async () => {
    setSession({ token: "" });
    setIcons([]);
    setTotalPages(0);
    setError("Your IconSearch session expired. Connect again to continue.");
  }, []);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!session.token) return;
      if (query.trim().length === 1 && library === "all") {
        setIcons([]);
        setTotalPages(0);
        setError("");
        return;
      }

      const requestId = ++requestRef.current;
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      if (append || iconCountRef.current > 0) setIsLoadingMore(true);
      else setIsLoading(true);
      setError("");

      try {
        const result =
          !append && isStarterPopularQuery(query, library)
            ? await searchStarterPopularIcons({
                token: session.token,
                style,
                legalOnly,
                signal: controller.signal,
              })
            : await searchIcons({
                token: session.token,
                query,
                library,
                style,
                legalOnly,
                page: nextPage,
                signal: controller.signal,
              });

        if (requestId !== requestRef.current) return;
        setIcons((current) =>
          append ? mergeIcons(current, result.icons) : result.icons,
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
        if (result.iconifySets.length > 0) setIconifySets(result.iconifySets);
        if (
          !append &&
          isStarterPopularQuery(query, library) &&
          style === "all" &&
          legalOnly
        ) {
          void Promise.all([
            writeJson(STARTER_CACHE_KEY, result.icons),
            writeJson(STARTER_CACHE_TIME_KEY, Date.now()),
          ]);
        }
      } catch (searchError) {
        if (controller.signal.aborted) return;
        if (requestId !== requestRef.current) return;
        if (
          searchError instanceof IconSearchApiError &&
          (searchError.status === 401 || searchError.status === 403)
        ) {
          await clearAuthenticatedState();
          return;
        }
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Could not search IconSearch.",
        );
      } finally {
        if (requestId === requestRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [
      clearAuthenticatedState,
      legalOnly,
      library,
      query,
      session.token,
      setError,
      setIconifySets,
      setIcons,
      setIsLoading,
      setIsLoadingMore,
      setPage,
      setTotalPages,
      style,
    ],
  );

  useEffect(() => {
    if (!session.token) return;
    const isBroadPopularRequest = !query.trim() && library === "all";
    const delay = isBroadPopularRequest ? 0 : query.trim() ? 80 : 100;
    const timeout = setTimeout(() => {
      void loadPage(1, false);
    }, delay);
    return () => clearTimeout(timeout);
  }, [library, loadPage, query, session.token]);

  const connect = useCallback(async () => {
    const nextSession = await beginSignIn();
    setSession(nextSession);
    setError("");
  }, [setError, setSession]);

  const disconnect = useCallback(async () => {
    await signOut();
    setSession({ token: "" });
    setIcons([]);
    setTotalPages(0);
  }, []);

  const rememberIcon = useCallback(
    async (icon: IconSearchIcon) => {
      setRecent((current) => {
        const next = [
          icon,
          ...current.filter((item) => item.id !== icon.id),
        ].slice(0, MAX_RECENT_ICONS);
        void writeJson(RECENT_KEY, next);
        return next;
      });
    },
    [setRecent],
  );

  const toggleFavorite = useCallback(
    async (icon: IconSearchIcon) => {
      setFavorites((current) => {
        const isFavorite = current.some((item) => item.id === icon.id);
        const next = isFavorite
          ? current.filter((item) => item.id !== icon.id)
          : [icon, ...current.filter((item) => item.id !== icon.id)].slice(
              0,
              MAX_FAVORITE_ICONS,
            );
        void writeJson(FAVORITES_KEY, next);
        return next;
      });
    },
    [setFavorites],
  );

  const sharedActions = {
    classes,
    outputFormat,
    customization,
    rememberIcon,
    toggleFavorite,
    disconnect,
  };

  if (!session.token) {
    return (
      <List
        key="signed-out"
        navigationTitle="IconSearch"
        isLoading={isLoading}
        searchBarPlaceholder="Sign in or create a free IconSearch account"
        actions={<AuthActions connect={connect} />}
      >
        <List.EmptyView
          icon={Icon.PersonCircle}
          title="Sign in or create an account"
          description={`Connect a free IconSearch account to search ${SEARCHABLE_ICON_COUNT.toLocaleString("en-US")} icons.`}
          actions={<AuthActions connect={connect} />}
        />
      </List>
    );
  }

  return (
    <List
      key="signed-in"
      navigationTitle="IconSearch"
      isLoading={isLoading && icons.length === 0}
      isShowingDetail
      searchBarPlaceholder="Search icons, e.g. home, arrow, github"
      searchText={query}
      filtering={false}
      onSearchTextChange={setQuery}
      pagination={{
        hasMore,
        pageSize: PAGE_SIZE,
        onLoadMore: () => void loadPage(page + 1, true),
      }}
      searchBarAccessory={
        <FilterDropdown
          library={library}
          style={style}
          legalOnly={legalOnly}
          outputFormat={outputFormat}
          size={quickSize}
          color={quickColor}
          iconifySets={iconifySets}
          onLibraryChange={setLibrary}
          onStyleChange={setStyle}
          onLegalOnlyChange={setLegalOnly}
          onOutputFormatChange={setOutputFormat}
          onSizeChange={setQuickSize}
          onColorChange={setQuickColor}
        />
      }
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.MagnifyingGlass}
        title={
          error
            ? "Search failed"
            : query.trim().length === 1
              ? "Keep typing"
              : "No icons found"
        }
        description={
          error || "Try another icon name, style, library, or safety filter."
        }
        actions={
          <ActionPanel>
            <Action
              title="Retry Search"
              icon={Icon.ArrowClockwise}
              onAction={() => void loadPage(1, false)}
            />
            <Action
              title="Sign out"
              icon={Icon.PersonCircle}
              onAction={() => void disconnect()}
            />
          </ActionPanel>
        }
      />

      {showingStarterSections && favorites.length > 0 ? (
        <List.Section title="Favorites" subtitle={`${favorites.length} saved`}>
          {favorites.map((icon) => (
            <IconItem
              key={`favorite-${icon.id}`}
              itemId={`favorite:${icon.id}`}
              icon={icon}
              favorite={favoriteIds.has(icon.id)}
              {...sharedActions}
            />
          ))}
        </List.Section>
      ) : null}

      {showingStarterSections && recent.length > 0 ? (
        <List.Section title="Recent" subtitle={`${recent.length} local picks`}>
          {recent.map((icon) => (
            <IconItem
              key={`recent-${icon.id}`}
              itemId={`recent:${icon.id}`}
              icon={icon}
              favorite={favoriteIds.has(icon.id)}
              {...sharedActions}
            />
          ))}
        </List.Section>
      ) : null}

      <List.Section title={query.trim() ? "Results" : "Popular"}>
        {icons.map((icon) => (
          <IconItem
            key={`result-${icon.id}`}
            itemId={`result:${icon.id}`}
            icon={icon}
            favorite={favoriteIds.has(icon.id)}
            {...sharedActions}
          />
        ))}
      </List.Section>
    </List>
  );
}

function AuthActions({ connect }: { connect: () => Promise<void> }) {
  return (
    <ActionPanel>
      <Action
        title="Sign in or Create Account"
        icon={Icon.Key}
        onAction={() => void connect()}
      />
      <Action.OpenInBrowser title="Open IconSearch" url={API_BASE} />
    </ActionPanel>
  );
}

function FilterDropdown({
  library,
  style,
  legalOnly,
  outputFormat,
  size,
  color,
  iconifySets,
  onLibraryChange,
  onStyleChange,
  onLegalOnlyChange,
  onOutputFormatChange,
  onSizeChange,
  onColorChange,
}: {
  library: string;
  style: SearchStyle;
  legalOnly: boolean;
  outputFormat: OutputFormat;
  size: number;
  color: string;
  iconifySets: string[];
  onLibraryChange: (value: string) => void;
  onStyleChange: (value: SearchStyle) => void;
  onLegalOnlyChange: (value: boolean) => void;
  onOutputFormatChange: (value: OutputFormat) => void;
  onSizeChange: (value: number) => void;
  onColorChange: (value: string) => void;
}) {
  const summaryValue = `summary:${library}:${style}:${legalOnly ? "safe" : "all"}:${outputFormat}:${size}:${color}`;

  const handleChange = (value: string) => {
    if (value.startsWith("summary:")) return;
    const [scope = "", ...rest] = value.split(":");
    const nextValue = rest.join(":");

    if (scope === "library") onLibraryChange(nextValue);
    if (scope === "style") onStyleChange(normalizeSearchStyle(nextValue));
    if (scope === "legal") onLegalOnlyChange(nextValue === "safe");
    if (scope === "format")
      onOutputFormatChange(normalizeOutputFormat(nextValue));
    if (scope === "size") onSizeChange(normalizeIconSize(nextValue));
    if (scope === "color") onColorChange(normalizeIconColor(nextValue));
  };

  return (
    <List.Dropdown
      tooltip="Filters, Size, and Color"
      value={summaryValue}
      onChange={handleChange}
    >
      <List.Dropdown.Item
        title={formatToolbarSummary(library, size, color)}
        value={summaryValue}
        icon={Icon.Filter}
      />

      <List.Dropdown.Section title="Library">
        <List.Dropdown.Item
          title="All Libraries"
          value="library:all"
          icon={activeIcon(library === "all")}
        />
        <List.Dropdown.Item
          title="All Iconify Collections"
          value="library:iconify"
          icon={activeIcon(library === "iconify")}
        />
        {NAMED_LIBRARIES.map(([id, label]) => (
          <List.Dropdown.Item
            key={id}
            title={label}
            value={`library:${id}`}
            icon={activeIcon(library === id)}
          />
        ))}
      </List.Dropdown.Section>

      {iconifySets.length > 0 ? (
        <List.Dropdown.Section title="Iconify Collections">
          {iconifySets.slice(0, 80).map((set) => (
            <List.Dropdown.Item
              key={set}
              title={formatIconifySet(set)}
              value={`library:iconify:${set}`}
              icon={activeIcon(library === `iconify:${set}`)}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}

      <List.Dropdown.Section title="Style">
        {Object.entries(SEARCH_STYLE_LABELS).map(([value, label]) => (
          <List.Dropdown.Item
            key={value}
            title={label}
            value={`style:${value}`}
            icon={activeIcon(style === value)}
          />
        ))}
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Safety">
        <List.Dropdown.Item
          title="Legal-Safe Only"
          value="legal:safe"
          icon={activeIcon(legalOnly)}
        />
        <List.Dropdown.Item
          title="All Licenses"
          value="legal:all"
          icon={activeIcon(!legalOnly)}
        />
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Output">
        {Object.entries(OUTPUT_FORMAT_LABELS).map(([value, label]) => (
          <List.Dropdown.Item
            key={value}
            title={label}
            value={`format:${value}`}
            icon={activeIcon(outputFormat === value)}
          />
        ))}
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Icon Size">
        {QUICK_SIZE_OPTIONS.map((option) => (
          <List.Dropdown.Item
            key={option}
            title={`${option} px`}
            value={`size:${option}`}
            icon={activeIcon(size === option)}
          />
        ))}
      </List.Dropdown.Section>

      <List.Dropdown.Section title="Icon Color">
        {COLOR_OPTIONS.filter((option) => option.value !== "custom").map(
          (option) => (
            <List.Dropdown.Item
              key={option.value}
              title={option.title}
              value={`color:${option.value}`}
              icon={color === option.value ? Icon.Checkmark : option.icon}
            />
          ),
        )}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function IconItem({
  itemId,
  icon,
  outputFormat,
  classes,
  customization,
  favorite,
  rememberIcon,
  toggleFavorite,
  disconnect,
}: {
  itemId: string;
  icon: IconSearchIcon;
  outputFormat: OutputFormat;
  classes: string;
  customization: IconCustomization;
  favorite: boolean;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
  toggleFavorite: (icon: IconSearchIcon) => Promise<void>;
  disconnect: () => Promise<void>;
}) {
  return (
    <List.Item
      id={itemId}
      title={icon.displayName}
      subtitle={icon.libraryName}
      keywords={[icon.name, icon.library, icon.libraryName, ...icon.tags]}
      icon={{
        source: getCustomizedPreviewUrl(icon, {
          ...LIST_THUMBNAIL_CUSTOMIZATION,
          color: customization.color,
        }),
        fallback: favorite ? Icon.Star : Icon.Circle,
      }}
      detail={
        <List.Item.Detail
          markdown={getListPreviewMarkdown(icon, customization)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Library"
                text={icon.libraryName}
              />
              {icon.npmPackage ? (
                <List.Item.Detail.Metadata.Label
                  title="Package"
                  text={icon.npmPackage}
                />
              ) : null}
              {icon.license ? (
                <List.Item.Detail.Metadata.Label
                  title="License"
                  text={icon.license}
                />
              ) : null}
              <List.Item.Detail.Metadata.Label
                title="Commercial Use"
                text={icon.legalSafe ? "Legal-safe" : "Verify license"}
              />
              <List.Item.Detail.Metadata.Label
                title="Size"
                text={`${customization.size} px`}
              />
              <List.Item.Detail.Metadata.Label
                title="Color"
                text={formatColorLabel(customization.color)}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <IconActions
          icon={icon}
          outputFormat={outputFormat}
          classes={classes}
          favorite={favorite}
          customization={customization}
          rememberIcon={rememberIcon}
          toggleFavorite={toggleFavorite}
          disconnect={disconnect}
        />
      }
    />
  );
}

function IconActions({
  icon,
  outputFormat,
  classes,
  favorite,
  rememberIcon,
  toggleFavorite,
  disconnect,
  showPreviewAction = true,
  customization = DEFAULT_CUSTOMIZATION,
}: {
  icon: IconSearchIcon;
  outputFormat: OutputFormat;
  classes: string;
  favorite: boolean;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
  toggleFavorite: (icon: IconSearchIcon) => Promise<void>;
  disconnect: () => Promise<void>;
  showPreviewAction?: boolean;
  customization?: IconCustomization;
}) {
  const defaultLabel = OUTPUT_FORMAT_LABELS[outputFormat];

  return (
    <ActionPanel title={icon.displayName}>
      <ActionPanel.Section>
        <Action.Push
          title="Customize and Use Icon"
          icon={Icon.Swatch}
          target={
            <IconCustomizer
              icon={icon}
              outputFormat={outputFormat}
              classes={classes}
              favorite={favorite}
              rememberIcon={rememberIcon}
              toggleFavorite={toggleFavorite}
              disconnect={disconnect}
              initialCustomization={customization}
            />
          }
        />
        <Action
          title={`Copy ${defaultLabel}`}
          icon={Icon.Clipboard}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: outputFormat,
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title={`Paste ${defaultLabel} into Frontmost App`}
          icon={Icon.TextCursor}
          onAction={() =>
            void runSnippetAction({
              mode: "paste",
              icon,
              format: outputFormat,
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        {showPreviewAction ? (
          <Action.Push
            title="Open Larger Preview"
            icon={Icon.Eye}
            target={
              <IconPreview
                icon={icon}
                outputFormat={outputFormat}
                classes={classes}
                favorite={favorite}
                rememberIcon={rememberIcon}
                toggleFavorite={toggleFavorite}
                disconnect={disconnect}
                customization={customization}
              />
            }
          />
        ) : null}
        <Action
          title={favorite ? "Remove Favorite" : "Save Favorite"}
          icon={favorite ? Icon.StarDisabled : Icon.Star}
          onAction={() => void toggleFavorite(icon)}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="IconSearch Account">
        <Action.OpenInBrowser
          title="Open IconSearch Account"
          icon={Icon.Person}
          url={`${API_BASE}/account`}
        />
        <Action
          title="Sign out of IconSearch"
          icon={Icon.Logout}
          onAction={() => void disconnect()}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="File">
        <Action
          title="Copy SVG File"
          icon={Icon.Document}
          onAction={() =>
            void runSvgFileAction({
              mode: "copy",
              icon,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Paste SVG File into Frontmost App"
          icon={Icon.Download}
          onAction={() =>
            void runSvgFileAction({
              mode: "paste",
              icon,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Export SVG for Drag and Drop"
          icon={Icon.Folder}
          onAction={() =>
            void exportSvgForDrag({
              icon,
              customization,
              rememberIcon,
            })
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy As">
        <Action
          title="Copy React"
          icon={Icon.Code}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: "react",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Copy Raw SVG"
          icon={Icon.Document}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: "svg",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Copy Tailwind Mask"
          icon={Icon.Swatch}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: "tailwind",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Copy Vue"
          icon={Icon.Code}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: "vue",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Copy Svelte"
          icon={Icon.Code}
          onAction={() =>
            void runSnippetAction({
              mode: "copy",
              icon,
              format: "svelte",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Paste As">
        <Action
          title="Paste React"
          icon={Icon.TextCursor}
          onAction={() =>
            void runSnippetAction({
              mode: "paste",
              icon,
              format: "react",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Paste Raw SVG"
          icon={Icon.TextCursor}
          onAction={() =>
            void runSnippetAction({
              mode: "paste",
              icon,
              format: "svg",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
        <Action
          title="Paste Tailwind Mask"
          icon={Icon.TextCursor}
          onAction={() =>
            void runSnippetAction({
              mode: "paste",
              icon,
              format: "tailwind",
              classes,
              customization,
              rememberIcon,
            })
          }
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Links">
        <Action.CopyToClipboard
          title="Copy SVG URL"
          icon={Icon.Link}
          content={getBestPreviewUrl(icon)}
          onCopy={() => void rememberIcon(icon)}
        />
        <Action.OpenInBrowser
          title="Open SVG Source"
          url={icon.sourceUrl || getBestPreviewUrl(icon)}
        />
        {icon.licenseUrl ? (
          <Action.OpenInBrowser title="Open License" url={icon.licenseUrl} />
        ) : null}
        <Action.OpenInBrowser title="Open IconSearch" url={API_BASE} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function runSnippetAction({
  mode,
  icon,
  format,
  classes,
  customization,
  rememberIcon,
}: {
  mode: "copy" | "paste";
  icon: IconSearchIcon;
  format: OutputFormat;
  classes: string;
  customization: IconCustomization;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
}) {
  const formatLabel = OUTPUT_FORMAT_LABELS[format];
  const toast = await showToast({
    style: Toast.Style.Animated,
    title:
      mode === "copy" ? `Copying ${formatLabel}` : `Pasting ${formatLabel}`,
    message: `${icon.displayName} - ${customization.size}px`,
  });

  try {
    const snippet = await createSnippet(icon, format, classes, customization);
    if (mode === "copy") await Clipboard.copy(snippet);
    else await Clipboard.paste(snippet);
    await rememberIcon(icon);

    toast.style = Toast.Style.Success;
    toast.title = mode === "copy" ? "Copied icon" : "Pasted icon";
    toast.message = `${icon.displayName} as ${formatLabel}`;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Icon action failed";
    toast.message =
      error instanceof Error ? error.message : "Could not use this icon.";
  }
}

async function runSvgFileAction({
  mode,
  icon,
  customization,
  rememberIcon,
}: {
  mode: FileClipboardMode;
  icon: IconSearchIcon;
  customization: IconCustomization;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
}) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: mode === "copy" ? "Copying SVG file" : "Pasting SVG file",
    message: `${icon.displayName} - ${customization.size}px`,
  });

  try {
    const filePath = await writeSvgFile(icon, customization);
    if (mode === "copy") await Clipboard.copy({ file: filePath });
    else await Clipboard.paste({ file: filePath });
    await rememberIcon(icon);

    toast.style = Toast.Style.Success;
    toast.title = mode === "copy" ? "Copied SVG file" : "Pasted SVG file";
    toast.message = icon.displayName;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "SVG file action failed";
    toast.message =
      error instanceof Error
        ? error.message
        : "Could not prepare this SVG file.";
  }
}

async function exportSvgForDrag({
  icon,
  customization,
  rememberIcon,
}: {
  icon: IconSearchIcon;
  customization: IconCustomization;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
}) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Exporting SVG",
    message: `${icon.displayName} - ${customization.size}px`,
  });

  try {
    const filePath = await writeSvgFile(icon, customization);
    await rememberIcon(icon);
    await showInFinder(filePath);
    toast.style = Toast.Style.Success;
    toast.title = "SVG ready to drag";
    toast.message = "Drag the revealed file into your design app.";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "SVG export failed";
    toast.message =
      error instanceof Error ? error.message : "Could not export this SVG.";
  }
}

function IconCustomizer({
  icon,
  outputFormat,
  classes,
  favorite,
  rememberIcon,
  toggleFavorite,
  disconnect,
  initialCustomization,
}: {
  icon: IconSearchIcon;
  outputFormat: OutputFormat;
  classes: string;
  favorite: boolean;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
  toggleFavorite: (icon: IconSearchIcon) => Promise<void>;
  disconnect: () => Promise<void>;
  initialCustomization: IconCustomization;
}) {
  const initialSize = String(normalizeIconSize(initialCustomization.size));
  const initialColor = normalizeIconColor(initialCustomization.color);
  const [sizeChoice, setSizeChoice] = useState(
    SIZE_OPTIONS.includes(Number(initialSize) as (typeof SIZE_OPTIONS)[number])
      ? initialSize
      : "custom",
  );
  const [customSize, setCustomSize] = useState(initialSize);
  const [colorChoice, setColorChoice] = useState<ColorChoice>(
    COLOR_OPTIONS.some((option) => option.value === initialColor)
      ? (initialColor as ColorChoice)
      : "custom",
  );
  const [customColor, setCustomColor] = useState(
    initialColor === "currentColor" ? "#2563EB" : initialColor,
  );
  const [format, setFormat] = useState(outputFormat);

  const sizeValue = sizeChoice === "custom" ? customSize : sizeChoice;
  const colorValue = colorChoice === "custom" ? customColor : colorChoice;
  const sizeNumber = Number.parseInt(sizeValue, 10);
  const sizeError =
    sizeChoice === "custom" &&
    (!Number.isFinite(sizeNumber) || sizeNumber < 8 || sizeNumber > 512)
      ? "Enter a size from 8 to 512 pixels."
      : undefined;
  const colorError =
    colorChoice === "custom" && !/^#[0-9a-f]{6}$/i.test(customColor.trim())
      ? "Use a six-digit hex color such as #2563EB."
      : undefined;
  const customization: IconCustomization = {
    size: normalizeIconSize(sizeValue),
    color: normalizeIconColor(colorValue),
  };

  const runWhenValid = (action: () => void) => {
    if (!sizeError && !colorError) {
      action();
      return;
    }
    void showToast({
      style: Toast.Style.Failure,
      title: "Check customization values",
      message: sizeError || colorError,
    });
  };

  return (
    <Form
      navigationTitle={`Customize ${icon.displayName}`}
      actions={
        <ActionPanel>
          <Action
            title={`Copy Customized ${OUTPUT_FORMAT_LABELS[format]}`}
            icon={Icon.Clipboard}
            onAction={() =>
              runWhenValid(() => {
                void runSnippetAction({
                  mode: "copy",
                  icon,
                  format,
                  classes,
                  customization,
                  rememberIcon,
                });
              })
            }
          />
          <Action
            title={`Paste Customized ${OUTPUT_FORMAT_LABELS[format]} into Frontmost App`}
            icon={Icon.TextCursor}
            onAction={() =>
              runWhenValid(() => {
                void runSnippetAction({
                  mode: "paste",
                  icon,
                  format,
                  classes,
                  customization,
                  rememberIcon,
                });
              })
            }
          />
          <Action.Push
            title="Preview Customized Icon"
            icon={Icon.Eye}
            target={
              <IconPreview
                icon={icon}
                outputFormat={format}
                classes={classes}
                favorite={favorite}
                rememberIcon={rememberIcon}
                toggleFavorite={toggleFavorite}
                disconnect={disconnect}
                customization={customization}
              />
            }
          />
          <ActionPanel.Section title="SVG File">
            <Action
              title="Copy Customized SVG File"
              icon={Icon.Document}
              onAction={() =>
                runWhenValid(() => {
                  void runSvgFileAction({
                    mode: "copy",
                    icon,
                    customization,
                    rememberIcon,
                  });
                })
              }
            />
            <Action
              title="Export Customized SVG for Drag and Drop"
              icon={Icon.Folder}
              onAction={() =>
                runWhenValid(() => {
                  void exportSvgForDrag({
                    icon,
                    customization,
                    rememberIcon,
                  });
                })
              }
            />
          </ActionPanel.Section>
          <Action
            title={favorite ? "Remove Favorite" : "Save Favorite"}
            icon={favorite ? Icon.StarDisabled : Icon.Star}
            onAction={() => void toggleFavorite(icon)}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={icon.displayName}
        text={`${icon.libraryName} - ${icon.legalSafe ? "Legal-safe" : "Verify license"}`}
      />
      <Form.Dropdown
        id="size"
        title="Size"
        value={sizeChoice}
        onChange={setSizeChoice}
      >
        {SIZE_OPTIONS.map((size) => (
          <Form.Dropdown.Item
            key={size}
            value={String(size)}
            title={`${size} px`}
          />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom Size" />
      </Form.Dropdown>
      {sizeChoice === "custom" ? (
        <Form.TextField
          id="customSize"
          title="Custom Size"
          placeholder="48"
          value={customSize}
          error={sizeError}
          onChange={setCustomSize}
        />
      ) : null}
      <Form.Dropdown
        id="color"
        title="Color"
        value={colorChoice}
        onChange={(value) => setColorChoice(value as ColorChoice)}
      >
        {COLOR_OPTIONS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
            icon={option.icon}
          />
        ))}
      </Form.Dropdown>
      {colorChoice === "custom" ? (
        <Form.TextField
          id="customColor"
          title="Custom Color"
          placeholder="#2563EB"
          value={customColor}
          error={colorError}
          onChange={setCustomColor}
        />
      ) : null}
      <Form.Dropdown
        id="format"
        title="Output"
        value={format}
        onChange={(value) => setFormat(normalizeOutputFormat(value))}
      >
        {Object.entries(OUTPUT_FORMAT_LABELS).map(([value, label]) => (
          <Form.Dropdown.Item key={value} value={value} title={label} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description
        title="Selection"
        text={`${customization.size} px - ${formatColorLabel(customization.color)} - ${OUTPUT_FORMAT_LABELS[format]}`}
      />
    </Form>
  );
}

function IconPreview({
  icon,
  outputFormat,
  classes,
  favorite,
  rememberIcon,
  toggleFavorite,
  disconnect,
  customization = DEFAULT_CUSTOMIZATION,
}: {
  icon: IconSearchIcon;
  outputFormat: OutputFormat;
  classes: string;
  favorite: boolean;
  rememberIcon: (icon: IconSearchIcon) => Promise<void>;
  toggleFavorite: (icon: IconSearchIcon) => Promise<void>;
  disconnect: () => Promise<void>;
  customization?: IconCustomization;
}) {
  return (
    <Detail
      navigationTitle={icon.displayName}
      markdown={getPreviewMarkdown(icon, customization)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Search Name" text={icon.name} />
          <Detail.Metadata.Label title="Library" text={icon.libraryName} />
          {icon.npmPackage ? (
            <Detail.Metadata.Label title="Package" text={icon.npmPackage} />
          ) : null}
          {icon.license ? (
            <Detail.Metadata.Label title="License" text={icon.license} />
          ) : null}
          <Detail.Metadata.Label
            title="Commercial Safety"
            text={icon.legalSafe ? "Legal-safe" : "Verify license"}
          />
          <Detail.Metadata.Label
            title="Selected Output"
            text={OUTPUT_FORMAT_LABELS[outputFormat]}
          />
          <Detail.Metadata.Label
            title="Size"
            text={`${customization.size} px`}
          />
          <Detail.Metadata.Label
            title="Color"
            text={formatColorLabel(customization.color)}
          />
          <Detail.Metadata.Link
            title="SVG"
            text="Open source SVG"
            target={icon.sourceUrl || getBestPreviewUrl(icon)}
          />
          {icon.licenseUrl ? (
            <Detail.Metadata.Link
              title="License Link"
              text="View license"
              target={icon.licenseUrl}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <IconActions
          icon={icon}
          outputFormat={outputFormat}
          classes={classes}
          favorite={favorite}
          rememberIcon={rememberIcon}
          toggleFavorite={toggleFavorite}
          disconnect={disconnect}
          showPreviewAction={false}
          customization={customization}
        />
      }
    />
  );
}

async function writeSvgFile(
  icon: IconSearchIcon,
  customization: IconCustomization,
): Promise<string> {
  const sourceSvg = await fetchSvgMarkup({
    ...icon,
    svgUrl: getBestPreviewUrl(icon),
    previewUrls: getOrderedPreviewUrls(icon),
  });
  const svg = customizeSvgMarkup(sourceSvg, icon, customization);
  const directory = join(environment.supportPath, "svg-files");
  await mkdir(directory, { recursive: true });

  const fileName = `${sanitizeFileName(icon.library)}-${sanitizeFileName(icon.name)}-${customization.size}px.svg`;
  const filePath = join(directory, fileName);
  await writeFile(filePath, svg, "utf8");
  return filePath;
}

function createBuiltInStarterIcon({
  library,
  libraryName,
  packageName,
  prefix,
  name,
  displayName,
  reactImport,
  reactUsage,
}: {
  library: string;
  libraryName: string;
  packageName: string;
  prefix: string;
  name: string;
  displayName: string;
  reactImport: string;
  reactUsage: string;
}): IconSearchIcon {
  const svgUrl = `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;

  return {
    id: `starter:${library}:${name}`,
    name,
    displayName,
    library,
    libraryName,
    npmPackage: packageName,
    license: "MIT",
    legalSafe: true,
    sourceUrl: svgUrl,
    svgUrl,
    previewUrls: [svgUrl],
    reactImport,
    reactUsage,
    tags: ["popular"],
  };
}

async function searchStarterPopularIcons({
  token,
  style,
  legalOnly,
  signal,
}: {
  token: string;
  style: SearchStyle;
  legalOnly: boolean;
  signal: AbortSignal;
}) {
  const settled = await Promise.allSettled(
    STARTER_LIBRARY_ROTATION.map((library) =>
      withTimeout(
        searchIcons({
          token,
          query: "",
          library,
          style,
          legalOnly,
          page: 1,
          limit: 6,
          signal,
        }),
        2_500,
      ),
    ),
  );

  const rejectedAuthError = settled.find(
    (result) =>
      result.status === "rejected" &&
      result.reason instanceof IconSearchApiError &&
      (result.reason.status === 401 || result.reason.status === 403),
  );
  if (rejectedAuthError?.status === "rejected") throw rejectedAuthError.reason;

  const groups = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value.icons] : [],
  );
  const icons = interleaveIconGroups(groups).slice(0, PAGE_SIZE);

  return {
    icons,
    total: icons.length,
    page: 1,
    totalPages: 1,
    iconifySets: [],
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Icon library request timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function isStarterPopularQuery(query: string, library: string): boolean {
  return !query.trim() && library === "all";
}

function interleaveIconGroups(groups: IconSearchIcon[][]): IconSearchIcon[] {
  const icons: IconSearchIcon[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(0, ...groups.map((group) => group.length));

  for (let index = 0; index < maxLength; index += 1) {
    for (const group of groups) {
      const icon = group[index];
      if (!icon || seen.has(icon.id)) continue;
      seen.add(icon.id);
      icons.push(icon);
    }
  }

  return icons;
}

function getListPreviewMarkdown(
  icon: IconSearchIcon,
  customization: IconCustomization,
): string {
  const lines = [
    `![${escapeMarkdown(icon.displayName)}](${getCustomizedPreviewUrl(icon, { ...LIST_PREVIEW_CUSTOMIZATION, color: customization.color })})`,
    "",
    `# ${escapeMarkdown(icon.displayName)}`,
    "",
    `\`${escapeBackticks(icon.name)}\``,
  ];

  if (icon.reactUsage) {
    lines.push("", "```tsx", icon.reactUsage, "```");
  }

  return lines.join("\n");
}

function getPreviewMarkdown(
  icon: IconSearchIcon,
  customization: IconCustomization,
): string {
  const previewUrl = getCustomizedPreviewUrl(icon, customization);
  const lines = [
    `# ${escapeMarkdown(icon.displayName)}`,
    "",
    `![${escapeMarkdown(icon.displayName)}](${previewUrl})`,
    "",
    `\`${escapeBackticks(icon.name)}\``,
    "",
    `${escapeMarkdown(icon.libraryName)} - ${icon.legalSafe ? "legal-safe" : "verify license before commercial use"}`,
  ];

  if (icon.reactUsage) {
    lines.push("", "```tsx", icon.reactUsage, "```");
  }

  return lines.join("\n");
}

function getBestPreviewUrl(icon: IconSearchIcon): string {
  return getOrderedPreviewUrls(icon)[0] || icon.svgUrl;
}

function getOrderedPreviewUrls(icon: IconSearchIcon): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    urls.push(value);
  };

  add(getLocalPreviewUrl(icon.library, icon.name));
  icon.previewUrls.forEach(add);
  add(icon.svgUrl);
  return urls;
}

function getLocalPreviewUrl(library: string, name: string): string {
  if (!LOCAL_PREVIEW_LIBRARIES.has(library)) return "";
  const normalizedName = name
    .replace(/\.svg$/i, "")
    .replace(/_/g, "-")
    .trim();
  if (!normalizedName) return "";
  return `${API_BASE}/api/icon-preview/${encodeURIComponent(library)}/${encodeURIComponent(normalizedName)}?v=named-library-preview-v3`;
}

function getCustomizedPreviewUrl(
  icon: IconSearchIcon,
  customization: IconCustomization,
): string {
  const iconifyUrl = icon.previewUrls.find((url) =>
    url.includes("api.iconify.design"),
  );
  const color =
    customization.color === "currentColor"
      ? environment.appearance === "dark"
        ? "#F4F4F5"
        : "#111827"
      : customization.color;
  return getCustomizedSvgUrl(iconifyUrl || getBestPreviewUrl(icon), {
    ...customization,
    color,
  });
}

function mergeIcons(
  current: IconSearchIcon[],
  next: IconSearchIcon[],
): IconSearchIcon[] {
  const seen = new Set(current.map((icon) => icon.id));
  return current.concat(
    next.filter((icon) => {
      if (seen.has(icon.id)) return false;
      seen.add(icon.id);
      return true;
    }),
  );
}

function formatToolbarSummary(
  library: string,
  size: number,
  color: string,
): string {
  const colorLabel =
    color === "currentColor" ? "Original" : color.toUpperCase();
  return `${formatCompactLibrary(library)} - ${size}px - ${colorLabel}`;
}

function formatCompactLibrary(library: string): string {
  if (library === "all") return "All";
  if (library === "iconify") return "Iconify";
  if (library.startsWith("iconify:"))
    return formatIconifySet(library.slice("iconify:".length));
  return (
    NAMED_LIBRARIES.find(([id]) => id === library)?.[1] || library
  ).replace(/\s+Icons$/, "");
}

function formatColorLabel(color: string): string {
  return color === "currentColor" ? "Original color" : color;
}

function activeIcon(active: boolean) {
  return active ? Icon.Checkmark : undefined;
}

function normalizeOutputFormat(value: unknown): OutputFormat {
  if (
    value === "svg" ||
    value === "vue" ||
    value === "svelte" ||
    value === "tailwind" ||
    value === "url"
  )
    return value;
  return "react";
}

function normalizeSearchStyle(value: unknown): SearchStyle {
  if (
    value === "stroke" ||
    value === "solid" ||
    value === "duotone" ||
    value === "twotone" ||
    value === "sharp"
  )
    return value;
  return "all";
}

function sanitizeFileName(value: string): string {
  const withoutUnsafeCharacters = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    const isControlCharacter = codePoint <= 31 || codePoint === 127;
    return isControlCharacter || '<>:"/\\|?*'.includes(character)
      ? "-"
      : character;
  }).join("");

  const sanitized = withoutUnsafeCharacters
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
  return sanitized || "icon";
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, "\\$1");
}

function escapeBackticks(value: string): string {
  return value.replace(/`/g, "\\`");
}
