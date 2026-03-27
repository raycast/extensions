import {
  Action,
  ActionPanel,
  Clipboard,
  Grid,
  Icon,
  LaunchProps,
  open,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addRecent, getRecents } from "./utils/recents";
import { getFavoriteSpecs, toggleFavorite } from "./utils/favorites";
import { parseMacros, expandMacro } from "./utils/macros";
import {
  getSpecUsage,
  incrementSpecUsage,
  sortSpecsByUsage,
} from "./utils/specUsage";
import type {
  ClassEntry,
  Mode,
  PageEntry,
  RecentEntry,
  SpecEntry,
  Suggestion,
} from "./types";
import { buildUrl } from "./utils/urlBuilder";
import { copyStatPriorityToClipboard } from "./utils/statPriority";
import {
  getClassForSpec,
  getClassIconPath,
  getClassSpecs,
  getModeQuery,
  getPageQuery,
  getPageTitle,
  getShortestSpecAlias,
  getSpecIconWithRolePath,
  resolveGridState,
  type GridState,
  type SpecGridItem,
} from "./utils/gridNavigation";

const MODE_ICON_SOURCES: Record<Mode, string> = {
  pve: "icons/mode-pve.jpg",
  pvp: "icons/mode-pvp.jpg",
};

const PAGE_ICON_SOURCES = {
  battleground: "icons/page-battleground.jpg",
  comp: "icons/page-comp.jpg",
  gear: "icons/page-gear.jpg",
  gems: "icons/page-gems.jpg",
  guide: "icons/page-guide.jpg",
  leveling: "icons/page-leveling.jpg",
  macro: "icons/page-macro.jpg",
  mythic: "icons/page-mythic.jpg",
  race: "icons/page-race.jpg",
  resource: "icons/page-resource.jpg",
  rotation: "icons/page-rotation.jpg",
  spell: "icons/page-spell.jpg",
  stats: "icons/page-stats.jpg",
  talents: "icons/page-talents.jpg",
} as const;

const PAGE_ICON_MAPPING: {
  patterns: string[];
  icon: keyof typeof PAGE_ICON_SOURCES;
}[] = [
  { patterns: ["battleground", "blitz"], icon: "battleground" },
  { patterns: ["comp"], icon: "comp" },
  { patterns: ["talent", "build"], icon: "talents" },
  { patterns: ["gear", "trinkets"], icon: "gear" },
  { patterns: ["rotation"], icon: "rotation" },
  { patterns: ["leveling"], icon: "leveling" },
  { patterns: ["resource"], icon: "resource" },
  { patterns: ["race"], icon: "race" },
  { patterns: ["macro"], icon: "macro" },
  { patterns: ["mythic"], icon: "mythic" },
  { patterns: ["stat"], icon: "stats" },
  { patterns: ["gem", "enchant", "consumable"], icon: "gems" },
  { patterns: ["spell"], icon: "spell" },
  { patterns: ["guide"], icon: "guide" },
];

export default function Command({
  arguments: args,
}: LaunchProps<{ arguments: Arguments.Iv }>) {
  const [query, setQuery] = useState(args.initialQuery ?? "");
  const [specUsage, setSpecUsage] = useState<Record<string, number>>({});
  const [favoriteSpecs, setFavoriteSpecs] = useState<SpecEntry[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const macros = useMemo(() => parseMacros(), []);
  const state = useMemo(
    () => resolveGridState(expandMacro(query, macros)),
    [query, macros],
  );

  const refreshFavorites = useCallback(() => {
    getFavoriteSpecs().then(setFavoriteSpecs);
  }, []);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  useEffect(() => {
    getSpecUsage().then(setSpecUsage);
  }, []);

  useEffect(() => {
    getRecents().then(setRecents);
  }, []);

  return (
    <Grid
      columns={5}
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      navigationTitle={getNavigationTitle(state)}
      searchBarPlaceholder="Pick a class or type sp pve gear"
      onSearchTextChange={setQuery}
      searchText={query}
      filtering={false}
      actions={
        <ActionPanel>
          <Action title="Reset Query" onAction={() => setQuery("")} />
          <ManageMacrosAction />
        </ActionPanel>
      }
    >
      {renderGrid(
        state,
        setQuery,
        specUsage,
        favoriteSpecs,
        refreshFavorites,
        recents,
        setRecents,
      )}
      <Grid.EmptyView
        title="No matching guides"
        description="Try a different class, spec, mode, or sub-page token."
        actions={
          <ActionPanel>
            <Action title="Reset Query" onAction={() => setQuery("")} />
            <ManageMacrosAction />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function getNavigationTitle(state: GridState): string {
  switch (state.kind) {
    case "classes":
      return "Choose Class";
    case "specs":
      return state.classEntry
        ? `Choose ${state.classEntry.name} Spec`
        : "Choose Spec";
    case "modes":
      return "Choose Mode";
    case "pages":
      return `Choose ${state.mode.toUpperCase()} Page`;
    case "results":
      return "Matching Guides";
  }
}

function renderGrid(
  state: GridState,
  setQuery: (value: string) => void,
  specUsage: Record<string, number>,
  favoriteSpecs: SpecEntry[],
  refreshFavorites: () => void,
  recents: RecentEntry[],
  setRecents: (entries: RecentEntry[]) => void,
): ReactNode {
  switch (state.kind) {
    case "classes": {
      const recentSection =
        recents.length > 0 ? (
          <Grid.Section
            key="recent"
            title="Recent"
            subtitle={`${recents.length}`}
            columns={5}
          >
            {recents.map((entry) => (
              <RecentItem
                key={entry.id}
                entry={entry}
                onOpen={() => {
                  addRecent({ ...entry, addedAt: Date.now() }).then(() =>
                    getRecents().then(setRecents),
                  );
                  open(entry.url);
                }}
              />
            ))}
          </Grid.Section>
        ) : null;

      const favSection =
        favoriteSpecs.length > 0 ? (
          <Grid.Section
            key="favorites"
            title="Favorites"
            subtitle={`${favoriteSpecs.length}`}
            columns={5}
          >
            {favoriteSpecs.map((spec) => {
              const classEntry = getClassForSpec(spec);
              const item: SpecGridItem = {
                classEntry,
                name: spec.slug
                  .split("-")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")
                  .replace(
                    new RegExp(`\\s+${classEntry.name}$`, "i"),
                    ` ${classEntry.name}`,
                  ),
                spec,
              };
              return (
                <SpecItem
                  key={spec.slug}
                  item={item}
                  isFavorited={true}
                  onSelect={() => {
                    incrementSpecUsage(item.spec.slug);
                    setQuery(getShortestSpecAlias(spec));
                  }}
                  onToggleFavorite={() =>
                    toggleFavorite(spec.slug).then(refreshFavorites)
                  }
                />
              );
            })}
          </Grid.Section>
        ) : null;

      const classSection = (
        <Grid.Section
          key="classes"
          title="Classes"
          subtitle={`${state.items.length}`}
          columns={5}
        >
          {state.items.map((classEntry) => (
            <ClassItem
              key={classEntry.slug}
              classEntry={classEntry}
              onSelect={() => setQuery(classEntry.aliases[0])}
            />
          ))}
        </Grid.Section>
      );

      return [recentSection, favSection, classSection].filter(
        Boolean,
      ) as ReactNode[];
    }
    case "specs":
      return (
        <Grid.Section
          title={state.classEntry ? state.classEntry.name : "Specs"}
          subtitle={`${state.items.length}`}
          columns={5}
        >
          {sortSpecsByUsage(state.items, specUsage).map((item) => (
            <SpecItem
              key={item.spec.slug}
              item={item}
              isFavorited={favoriteSpecs.some((f) => f.slug === item.spec.slug)}
              onSelect={() => {
                incrementSpecUsage(item.spec.slug);
                setQuery(getShortestSpecAlias(item.spec));
              }}
              onToggleFavorite={() =>
                toggleFavorite(item.spec.slug).then(refreshFavorites)
              }
            />
          ))}
        </Grid.Section>
      );
    case "modes":
      return (
        <Grid.Section
          title="Modes"
          subtitle={`${state.items.length}`}
          columns={4}
        >
          {state.items.map((mode) => (
            <ModeItem
              key={mode}
              mode={mode}
              spec={state.spec}
              onSelect={() => setQuery(getModeQuery(state.spec, mode))}
            />
          ))}
        </Grid.Section>
      );
    case "pages":
      return (
        <Grid.Section
          title={`${getShortestSpecAlias(state.spec).toUpperCase()} ${state.mode.toUpperCase()}`}
          subtitle={`${state.items.length}`}
          columns={5}
        >
          {state.items.map((page) => (
            <PageItem
              key={`${state.spec.slug}-${state.mode}-${page.urlSuffix}`}
              mode={state.mode}
              page={page}
              setQuery={setQuery}
              setRecents={setRecents}
              spec={state.spec}
            />
          ))}
        </Grid.Section>
      );
    case "results": {
      const pveSuggestions = state.suggestions.filter((s) => s.mode === "pve");
      const pvpSuggestions = state.suggestions.filter((s) => s.mode === "pvp");

      return [
        <Grid.Section
          key="pve"
          title="PvE"
          subtitle={`${pveSuggestions.length}`}
          columns={5}
        >
          {pveSuggestions.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </Grid.Section>,
        <Grid.Section
          key="pvp"
          title="PvP"
          subtitle={`${pvpSuggestions.length}`}
          columns={5}
        >
          {pvpSuggestions.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </Grid.Section>,
      ];
    }
  }
}

function ClassItem({
  classEntry,
  onSelect,
}: {
  classEntry: ClassEntry;
  onSelect: () => void;
}) {
  const specCount = `${getClassSpecs(classEntry).length} specs`;

  return (
    <Grid.Item
      content={getClassIconPath(classEntry)}
      title={classEntry.name}
      subtitle={specCount}
      keywords={classEntry.aliases}
      actions={
        <ActionPanel>
          <Action title={`Choose ${classEntry.name}`} onAction={onSelect} />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function SpecItem({
  item,
  isFavorited,
  onSelect,
  onToggleFavorite,
}: {
  item: SpecGridItem;
  isFavorited: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <Grid.Item
      content={getSpecIconWithRolePath(item.spec)}
      title={item.name}
      subtitle={item.classEntry.name}
      keywords={item.spec.aliases}
      actions={
        <ActionPanel>
          <Action title={`Choose ${item.name}`} onAction={onSelect} />
          <Action
            title="Copy Stat Priority"
            icon={Icon.Clipboard}
            onAction={async () => {
              const result = await copyStatPriorityToClipboard(
                item.spec.slug,
                item.spec.pveRole,
              );
              await showHUD(result ?? "Could not fetch stat priority");
            }}
          />
          <Action
            title={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorited ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function ModeItem({
  mode,
  spec,
  onSelect,
}: {
  mode: Mode;
  spec: SpecEntry;
  onSelect: () => void;
}) {
  const defaultGuide = mode === "pve" ? "guide" : "pvp-guide";

  return (
    <Grid.Item
      content={MODE_ICON_SOURCES[mode]}
      title={mode.toUpperCase()}
      subtitle={getShortestSpecAlias(spec)}
      actions={
        <ActionPanel>
          <Action title={`Choose ${mode.toUpperCase()}`} onAction={onSelect} />
          <Action.OpenInBrowser
            title={`Open ${mode.toUpperCase()} Guide`}
            url={buildUrl({
              spec,
              mode,
              page: {
                aliases: ["guide"],
                urlSuffix: defaultGuide,
                displayTitle: "Guide",
              },
            })}
          />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function PageItem({
  mode,
  page,
  setQuery,
  setRecents,
  spec,
}: {
  mode: Mode;
  page: PageEntry;
  setQuery: (value: string) => void;
  setRecents: (entries: RecentEntry[]) => void;
  spec: SpecEntry;
}) {
  const query = getPageQuery(spec, mode, page);
  const title = getPageTitle(page);
  const url = buildUrl({ spec, mode, page });
  const entryId = `${spec.slug}-${mode}-${page.urlSuffix}`;
  const entryTitle = `${getShortestSpecAlias(spec).toUpperCase()} — ${title}`;

  function handleOpen() {
    const entry: RecentEntry = {
      id: entryId,
      url,
      title: entryTitle,
      specSlug: spec.slug,
      addedAt: Date.now(),
    };
    addRecent(entry).then(() => getRecents().then(setRecents));
    open(url);
  }

  return (
    <Grid.Item
      content={getPageIcon(page)}
      title={title}
      subtitle={query}
      keywords={page.aliases.filter((alias) => alias !== "")}
      actions={
        <ActionPanel>
          <Action title={`Open ${title}`} onAction={handleOpen} />
          <Action
            title="Copy Link"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={async () => {
              await Clipboard.copy(url);
              await showToast({
                style: Toast.Style.Success,
                title: "Link Copied",
                message: entryTitle,
              });
            }}
          />
          <Action title="Fill Query" onAction={() => setQuery(query)} />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function getPageIcon(page: PageEntry): string {
  const match = PAGE_ICON_MAPPING.find(({ patterns }) =>
    patterns.some((p) => page.urlSuffix.includes(p)),
  );
  return PAGE_ICON_SOURCES[match?.icon ?? "guide"];
}

function SuggestionItem({ suggestion }: { suggestion: Suggestion }) {
  const classEntry = getClassForSpec({
    aliases: [],
    pveRole: "",
    slug: suggestion.specSlug,
  });

  return (
    <Grid.Item
      content={suggestion.icon}
      title={suggestion.title}
      subtitle={suggestion.subtitle}
      accessory={{
        tooltip: classEntry.name,
        icon: MODE_ICON_SOURCES[suggestion.mode],
      }}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={suggestion.url} title="Open Guide" />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function RecentItem({
  entry,
  onOpen,
}: {
  entry: RecentEntry;
  onOpen: () => void;
}) {
  return (
    <Grid.Item
      content={getSpecIconWithRolePath({
        slug: entry.specSlug,
        aliases: [],
        pveRole: "",
      })}
      title={entry.title}
      actions={
        <ActionPanel>
          <Action title="Open Guide" onAction={onOpen} />
          <ManageMacrosAction />
        </ActionPanel>
      }
    />
  );
}

function ManageMacrosAction() {
  return (
    <ActionPanel.Section>
      <Action
        title="Manage Custom Macros"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );
}
