import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Color,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  clearCatalogCaches,
  fetchSkillDocument,
  loadSkills,
  loadTools,
  skillGetImportSpec,
} from "./kody";
import {
  PIN_LIMIT,
  emptyState,
  formatContents,
  formatMention,
  itemKey,
  pinItem,
  pruneKeys,
  recordRecent,
  rowTitle,
  mergeInventory,
  presentPouch,
  scopeOptions,
  unpinItem,
  withoutRootExports,
  type Item,
  type MergedPouch,
  type PouchEmpty,
  type PouchRow,
  type PouchSection,
  type Scope,
  type ScopeOption,
  type SkillItem,
} from "./pouch";

const PINNED_STORAGE_KEY = "pouch-pinned";
const RECENT_STORAGE_KEY = "pouch-recent";
const pinIcon = { source: "pin.svg", tintColor: Color.SecondaryText };
const pinActionIcon = { source: "pin.svg", tintColor: Color.PrimaryText };

const inventoryCache = new Cache();
const INVENTORY_CACHE_KEY = "pouch-inventory";

function readCachedPouch(): MergedPouch {
  const raw = inventoryCache.get(INVENTORY_CACHE_KEY);
  if (!raw) {
    return { items: [], errors: [] };
  }
  try {
    return { items: withoutRootExports(JSON.parse(raw) as Item[]), errors: [] };
  } catch {
    return { items: [], errors: [] };
  }
}

const initialPouch = readCachedPouch();

export default function KodyPouch() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const { data, isLoading, revalidate } = useCachedPromise(loadPouch, [], {
    initialData: initialPouch,
    keepPreviousData: true,
  });
  const pouch = data ?? { items: [], errors: [] };
  const options = scopeOptions(pouch.items);
  const sections = presentPouch(pouch.items, query, scope, { pinned, recent });
  const empty = emptyState({
    items: pouch.items,
    query,
    scope,
    errors: pouch.errors,
    isLoading,
  });
  useEffect(() => {
    void (async () => {
      const [pinnedRaw, recentRaw] = await Promise.all([
        LocalStorage.getItem<string>(PINNED_STORAGE_KEY),
        LocalStorage.getItem<string>(RECENT_STORAGE_KEY),
      ]);
      setPinned(parseKeys(pinnedRaw));
      setRecent(parseKeys(recentRaw));
    })();
  }, []);
  const onRefresh = () => {
    clearCatalogCaches();
    revalidate();
  };
  useEffect(() => {
    if (pouch.items.length === 0) {
      return;
    }
    const nextPinned = pruneKeys(pinned, pouch.items);
    const nextRecent = pruneKeys(recent, pouch.items);
    if (nextPinned.length !== pinned.length) {
      setPinned(nextPinned);
      void LocalStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(nextPinned));
    }
    if (nextRecent.length !== recent.length) {
      setRecent(nextRecent);
      void LocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(nextRecent));
    }
  }, [pouch.items, pinned, recent]);
  const onPick = (item: Item) => {
    const next = recordRecent(pruneKeys(recent, pouch.items), itemKey(item));
    setRecent(next);
    void LocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  };
  const onTogglePin = (item: Item) => {
    const key = itemKey(item);
    const live = pruneKeys(pinned, pouch.items);
    if (live.includes(key)) {
      const next = unpinItem(live, key);
      setPinned(next);
      void LocalStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      return;
    }
    const result = pinItem(live, key);
    if (!result.ok) {
      void showToast({
        style: Toast.Style.Failure,
        title: `Pin limit is ${PIN_LIMIT}. Unpin one first.`,
      });
      return;
    }
    setPinned(result.keys);
    void LocalStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(result.keys));
  };

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Kody's Pouch"
      searchBarAccessory={
        <ScopeDropdown options={options} scope={scope} onChange={setScope} />
      }
      navigationTitle={
        pouch.errors.length > 0 ? pouch.errors.join(" · ") : "Kody's Pouch"
      }
    >
      {sections.map((section) => (
        <PouchSectionRows
          key={section.title ?? "flat"}
          section={section}
          pinned={pinned}
          showPinAccessory={section.title === "Pinned"}
          onPick={onPick}
          onTogglePin={onTogglePin}
          onRefresh={onRefresh}
        />
      ))}
      {empty ? <PouchEmpty state={empty} onRefresh={onRefresh} /> : null}
    </List>
  );
}

function PouchSectionRows({
  section,
  pinned,
  showPinAccessory,
  onPick,
  onTogglePin,
  onRefresh,
}: {
  section: PouchSection;
  pinned: string[];
  showPinAccessory: boolean;
  onPick: (item: Item) => void;
  onTogglePin: (item: Item) => void;
  onRefresh: () => void;
}) {
  const rows = section.rows.map((row) => (
    <PouchItem
      key={itemKey(row.item)}
      row={row}
      pinned={pinned.includes(itemKey(row.item))}
      showPinAccessory={showPinAccessory}
      onPick={onPick}
      onTogglePin={onTogglePin}
      onRefresh={onRefresh}
    />
  ));
  if (section.title === null) {
    return <>{rows}</>;
  }
  return <List.Section title={section.title}>{rows}</List.Section>;
}

function PouchItem({
  row,
  pinned,
  showPinAccessory,
  onPick,
  onTogglePin,
  onRefresh,
}: {
  row: PouchRow;
  pinned: boolean;
  showPinAccessory: boolean;
  onPick: (item: Item) => void;
  onTogglePin: (item: Item) => void;
  onRefresh: () => void;
}) {
  const mention = formatMention(row.item, {
    skillGetImport: skillGetImportSpec(),
  });
  const skill = row.item.kind === "skill" ? row.item : null;
  return (
    <List.Item
      id={itemKey(row.item)}
      icon={{
        source:
          row.item.kind === "skill" ? Icon.Document : Icon.WrenchScrewdriver,
        tintColor: Color.SecondaryText,
      }}
      title={rowTitle(row.item)}
      subtitle={row.subtitle}
      accessories={showPinAccessory ? [{ icon: pinIcon }] : undefined}
      actions={
        <ActionPanel>
          <Action.Paste
            title="Paste Mention"
            content={mention}
            onPaste={() => onPick(row.item)}
          />
          {skill ? (
            <Action
              title="Paste Contents"
              shortcut={{ modifiers: ["shift"], key: "return" }}
              onAction={() => void pasteSkillContents(skill, onPick)}
            />
          ) : null}
          <Action.CopyToClipboard title="Copy Mention" content={mention} />
          {skill ? (
            <Action
              title="Copy Contents"
              onAction={() => void copySkillContents(skill)}
            />
          ) : null}
          <Action
            title={pinned ? "Unpin" : "Pin"}
            icon={pinActionIcon}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            onAction={() => onTogglePin(row.item)}
          />
          <RefreshPouchAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

async function loadSkillContents(skill: SkillItem): Promise<string | null> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading Contents…",
  });
  const loaded = await fetchSkillDocument(skill.id);
  if (loaded.status !== "ok") {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not load Contents";
    toast.message = loaded.error.message;
    return null;
  }
  await toast.hide();
  return formatContents(skill.name, loaded.value);
}

async function pasteSkillContents(
  skill: SkillItem,
  onPick: (item: Item) => void,
) {
  const contents = await loadSkillContents(skill);
  if (contents === null) {
    return;
  }
  try {
    await Clipboard.paste(contents);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not paste Contents",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }
  onPick(skill);
  await closeMainWindow();
}

async function copySkillContents(skill: SkillItem) {
  const contents = await loadSkillContents(skill);
  if (contents === null) {
    return;
  }
  try {
    await Clipboard.copy(contents);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy Contents",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function RefreshPouchAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh Pouch"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}

function ScopeDropdown({
  options,
  scope,
  onChange,
}: {
  options: ScopeOption[];
  scope: Scope;
  onChange: (scope: Scope) => void;
}) {
  const kinds = options.filter((option) => option.scope.type !== "parent");
  const parents = options.filter((option) => option.scope.type === "parent");
  return (
    <List.Dropdown
      tooltip="Scope"
      value={scopeValue(scope)}
      onChange={(value) => onChange(scopeFromValue(value))}
    >
      <List.Dropdown.Section title="Kind">
        {kinds.map((option) => (
          <List.Dropdown.Item
            key={scopeValue(option.scope)}
            title={`${option.title} (${option.count})`}
            value={scopeValue(option.scope)}
          />
        ))}
      </List.Dropdown.Section>
      {parents.length > 0 ? (
        <List.Dropdown.Section title="Parents">
          {parents.map((option) => (
            <List.Dropdown.Item
              key={scopeValue(option.scope)}
              title={`${option.title} (${option.count})`}
              value={scopeValue(option.scope)}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}

function scopeValue(scope: Scope): string {
  switch (scope.type) {
    case "all":
      return "all";
    case "skills":
      return "skills";
    case "tools":
      return "tools";
    case "parent":
      return `parent:${scope.parent}`;
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

function scopeFromValue(value: string): Scope {
  switch (value) {
    case "all":
      return { type: "all" };
    case "skills":
      return { type: "skills" };
    case "tools":
      return { type: "tools" };
    default:
      if (value.startsWith("parent:")) {
        return { type: "parent", parent: value.slice("parent:".length) };
      }
      return { type: "all" };
  }
}

function PouchEmpty({
  state,
  onRefresh,
}: {
  state: PouchEmpty;
  onRefresh: () => void;
}) {
  const actions = (
    <ActionPanel>
      <RefreshPouchAction onRefresh={onRefresh} />
    </ActionPanel>
  );
  switch (state.kind) {
    case "error":
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not refresh Pouch"
          description={state.message}
          actions={actions}
        />
      );
    case "no-match":
      return (
        <List.EmptyView
          icon={{
            source: Icon.MagnifyingGlass,
            tintColor: Color.SecondaryText,
          }}
          title={state.title}
          actions={actions}
        />
      );
    case "empty":
      return (
        <List.EmptyView
          icon={{ source: Icon.Tray, tintColor: Color.SecondaryText }}
          title={state.title}
          description={state.description}
          actions={actions}
        />
      );
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

function parseKeys(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) &&
      parsed.every((key) => typeof key === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

async function loadPouch(): Promise<MergedPouch> {
  const lastGood = readCachedPouch().items;
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const merged = mergeInventory({ tools, skills, lastGood });
  if (merged.errors.length === 0 && merged.items.length > 0) {
    inventoryCache.set(INVENTORY_CACHE_KEY, JSON.stringify(merged.items));
  }
  return merged;
}
