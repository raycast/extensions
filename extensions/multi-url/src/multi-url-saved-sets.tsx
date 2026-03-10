import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  LaunchType,
  launchCommand,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  applySavedSetRunStats,
  browserChoiceFromApp,
  createSavedSetShareFingerprint,
  createSharedSetFingerprint,
  createShareCodeFromSavedSet,
  createShareCodeFromSavedSets,
  createUniqueSetName,
  DEFAULT_SHORTCUT_SLOTS,
  dedupe,
  formatDateTime,
  formatPercent,
  getSetFailureRate,
  HistoryEntry,
  KNOWN_BROWSER_APPS,
  loadHistory,
  loadSavedSets,
  loadShortcutSlots,
  loadTrash,
  MAX_HISTORY_ITEMS,
  MAX_TRASH_ITEMS,
  MAX_URLS_PER_RUN,
  normalizeSingleEmoji,
  openInBrowser,
  parseSharedSetsInput,
  parseInputUrls,
  parseTagInput,
  resolveBrowserApp,
  saveHistory,
  saveSavedSets,
  saveShortcutSlots,
  saveTrash,
  SavedSet,
  SHORTCUT_SLOT_KEYS,
  ShortcutSlotKey,
  ShortcutSlots,
  sortSavedSets,
  toggleSetQuickUrlSlot,
  TrashedSet,
} from "./shared";
import { MultiUrlHelpAction } from "./multi-url-help";

const SLOT_KEYS = SHORTCUT_SLOT_KEYS;
const TAG_FILTER_ALL = "__all__";
const EMOJI_NONE = "__none__";
const EMOJI_CUSTOM = "__custom__";
const QUICK_EMOJI_OPTIONS = [
  { value: "🚀", title: "🚀 Rocket" },
  { value: "⚡", title: "⚡ Lightning" },
  { value: "🔥", title: "🔥 Fire" },
  { value: "✅", title: "✅ Check" },
  { value: "🧠", title: "🧠 Brain" },
  { value: "🎯", title: "🎯 Target" },
  { value: "🛠️", title: "🛠️ Tools" },
  { value: "📚", title: "📚 Books" },
  { value: "📰", title: "📰 News" },
  { value: "💼", title: "💼 Briefcase" },
  { value: "🌐", title: "🌐 Globe" },
  { value: "💡", title: "💡 Idea" },
  { value: "📈", title: "📈 Growth" },
  { value: "💰", title: "💰 Money" },
  { value: "🧪", title: "🧪 Lab" },
  { value: "🤖", title: "🤖 Robot" },
] as const;

type EditSetFormValues = {
  name: string;
  tags: string;
  urls: string;
  browserChoice: string;
  customBrowserApp: string;
  emojiChoice: string;
  customEmoji: string;
};

type CreateSetFormValues = {
  name: string;
  tags: string;
  urls: string;
  browserChoice: string;
  customBrowserApp: string;
  emojiChoice: string;
  customEmoji: string;
};

type CreateSetSubmitOptions = {
  openAfterSave?: boolean;
};

type EditSetFormProps = {
  savedSet: SavedSet;
  onSave: (setId: string, values: EditSetFormValues) => Promise<boolean>;
};

type CreateSetFormProps = {
  onSubmit: (values: CreateSetFormValues, options?: CreateSetSubmitOptions) => Promise<boolean>;
};

type SetStatsDetailProps = {
  savedSet: SavedSet;
};

type ImportFormValues = {
  shareCode: string;
};

type ExportScope = "selected" | "all";

type ExportFormValues = {
  scope: ExportScope;
};

type ImportSharedSetFormProps = {
  onSubmit: (rawShareCode: string) => Promise<boolean>;
};

type ExportUrlSetsFormProps = {
  selectedSet: SavedSet | null;
  savedSetsCount: number;
  onCopy: (scope: ExportScope) => Promise<boolean>;
};

function sortTrash(trash: TrashedSet[]): TrashedSet[] {
  return [...trash].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

function slotLabel(slot: ShortcutSlotKey): string {
  return `QuickURL #${slot.replace("slot", "")}`;
}

function getAssignedSlots(slots: ShortcutSlots, setId: string): ShortcutSlotKey[] {
  return SLOT_KEYS.filter((slot) => slots[slot] === setId);
}

function countValidUrls(rawUrls: string): number {
  return parseInputUrls(rawUrls).uniqueValid.length;
}

function formatTagAccessory(tags: string[]): string | null {
  if (tags.length === 0) {
    return null;
  }

  if (tags.length <= 2) {
    return tags.map((tag) => `#${tag}`).join(" ");
  }

  return `#${tags[0]} #${tags[1]} +${tags.length - 2}`;
}

function SetStatsDetail({ savedSet }: SetStatsDetailProps) {
  const totalUrlEvents = savedSet.totalOpenedCount + savedSet.totalFailedCount + savedSet.totalInvalidCount;
  const failureRate = getSetFailureRate(savedSet);
  const successRate = totalUrlEvents > 0 ? 1 - failureRate : 0;

  return (
    <Detail
      navigationTitle={`Stats: ${savedSet.name}`}
      markdown={`# ${savedSet.name}

- Total opens: **${savedSet.useCount}**
- Last opened: **${savedSet.lastOpenedAt ? formatDateTime(savedSet.lastOpenedAt) : "Never"}**
- Success rate: **${formatPercent(successRate)}**
- Failure rate: **${formatPercent(failureRate)}**
- URLs opened: **${savedSet.totalOpenedCount}**
- URLs failed: **${savedSet.totalFailedCount}**
- Invalid URL inputs: **${savedSet.totalInvalidCount}**`}
      actions={
        <ActionPanel>
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    />
  );
}

function EditSetForm({ savedSet, onSave }: EditSetFormProps) {
  const { pop } = useNavigation();
  const initialBrowser = browserChoiceFromApp(savedSet.browserApp);
  const [name, setName] = useState(savedSet.name);
  const [tags, setTags] = useState(savedSet.tags.join(", "));
  const [urls, setUrls] = useState(savedSet.urls);
  const [browserChoice, setBrowserChoice] = useState<string>(initialBrowser.browserChoice);
  const [customBrowserApp, setCustomBrowserApp] = useState<string>(initialBrowser.customBrowserApp);
  const hasQuickOption = QUICK_EMOJI_OPTIONS.some((item) => item.value === savedSet.emoji);
  const [emojiChoice, setEmojiChoice] = useState(
    savedSet.emoji ? (hasQuickOption ? savedSet.emoji : EMOJI_CUSTOM) : EMOJI_NONE,
  );
  const [customEmoji, setCustomEmoji] = useState(savedSet.emoji && !hasQuickOption ? savedSet.emoji : "");

  async function handleSubmit(values: EditSetFormValues) {
    const didSave = await onSave(savedSet.id, values);
    if (didSave) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle={`Edit Set: ${savedSet.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Set" onSubmit={handleSubmit} />
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} />
      <Form.TextArea
        id="urls"
        title="URLs"
        value={urls}
        onChange={setUrls}
        placeholder={`https://raycast.com\nhttps://openai.com\nexample.com`}
      />
      <Form.Dropdown id="emojiChoice" title="Emoji" value={emojiChoice} onChange={setEmojiChoice}>
        <Form.Dropdown.Item value={EMOJI_NONE} title="None" />
        {QUICK_EMOJI_OPTIONS.map((item) => (
          <Form.Dropdown.Item key={`emoji-option-${item.value}`} value={item.value} title={item.title} />
        ))}
        <Form.Dropdown.Item value={EMOJI_CUSTOM} title="Custom..." />
      </Form.Dropdown>
      {emojiChoice === EMOJI_CUSTOM && (
        <Form.TextField
          id="customEmoji"
          title="Custom Emoji"
          value={customEmoji}
          onChange={setCustomEmoji}
          placeholder="Example: 🐱"
        />
      )}
      <Form.TextArea id="tags" title="Tags" value={tags} onChange={setTags} placeholder="work, news, clients" />
      <Form.Dropdown id="browserChoice" title="Browser" value={browserChoice} onChange={setBrowserChoice}>
        <Form.Dropdown.Item value="default" title="System Default Browser" />
        {KNOWN_BROWSER_APPS.map((browser) => (
          <Form.Dropdown.Item key={browser} value={browser} title={browser} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom App Name" />
      </Form.Dropdown>
      {browserChoice === "custom" && (
        <Form.TextField
          id="customBrowserApp"
          title="Custom Browser App"
          value={customBrowserApp}
          onChange={setCustomBrowserApp}
          placeholder="Example: Google Chrome Canary"
        />
      )}
    </Form>
  );
}

function CreateSetForm({ onSubmit }: CreateSetFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [urls, setUrls] = useState("");
  const [emojiChoice, setEmojiChoice] = useState(EMOJI_NONE);
  const [customEmoji, setCustomEmoji] = useState("");
  const [browserChoice, setBrowserChoice] = useState("default");
  const [customBrowserApp, setCustomBrowserApp] = useState("");

  async function handleSubmit(values: CreateSetFormValues) {
    const created = await onSubmit(values);
    if (created) {
      pop();
    }
  }

  async function handleSubmitAndOpen(values: CreateSetFormValues) {
    const created = await onSubmit(values, { openAfterSave: true });
    if (created) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Create New Set"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Set" onSubmit={handleSubmit} />
          <Action.SubmitForm
            title="Save Set and Open Links"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={handleSubmitAndOpen}
          />
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" value={name} onChange={setName} placeholder="Example: Morning Links" />
      <Form.TextArea
        id="urls"
        title="URLs"
        value={urls}
        onChange={setUrls}
        placeholder={`https://raycast.com\nhttps://openai.com\nexample.com`}
      />
      <Form.Dropdown id="emojiChoice" title="Emoji" value={emojiChoice} onChange={setEmojiChoice}>
        <Form.Dropdown.Item value={EMOJI_NONE} title="None" />
        {QUICK_EMOJI_OPTIONS.map((item) => (
          <Form.Dropdown.Item key={`emoji-option-${item.value}`} value={item.value} title={item.title} />
        ))}
        <Form.Dropdown.Item value={EMOJI_CUSTOM} title="Custom..." />
      </Form.Dropdown>
      {emojiChoice === EMOJI_CUSTOM && (
        <Form.TextField
          id="customEmoji"
          title="Custom Emoji"
          value={customEmoji}
          onChange={setCustomEmoji}
          placeholder="Example: 🐱"
        />
      )}
      <Form.TextArea id="tags" title="Tags" value={tags} onChange={setTags} placeholder="work, news, clients" />
      <Form.Dropdown id="browserChoice" title="Browser" value={browserChoice} onChange={setBrowserChoice}>
        <Form.Dropdown.Item value="default" title="System Default Browser" />
        {KNOWN_BROWSER_APPS.map((browser) => (
          <Form.Dropdown.Item key={browser} value={browser} title={browser} />
        ))}
        <Form.Dropdown.Item value="custom" title="Custom App Name" />
      </Form.Dropdown>
      {browserChoice === "custom" && (
        <Form.TextField
          id="customBrowserApp"
          title="Custom Browser App"
          value={customBrowserApp}
          onChange={setCustomBrowserApp}
          placeholder="Example: Google Chrome Canary"
        />
      )}
    </Form>
  );
}

function ImportSharedSetForm({ onSubmit }: ImportSharedSetFormProps) {
  const { pop } = useNavigation();
  const [shareCode, setShareCode] = useState("");

  async function handleSubmit(values: ImportFormValues) {
    const didImport = await onSubmit(values.shareCode);
    if (didImport) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Import URL-Set"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import URL-Set" onSubmit={handleSubmit} />
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="shareCode"
        title="Share Code"
        value={shareCode}
        onChange={setShareCode}
        placeholder="Paste a Multi-URL share code"
      />
    </Form>
  );
}

function ExportUrlSetsForm({ selectedSet, savedSetsCount, onCopy }: ExportUrlSetsFormProps) {
  const { pop } = useNavigation();
  const [scope, setScope] = useState<ExportScope>(selectedSet ? "selected" : "all");

  async function handleSubmit(values: ExportFormValues) {
    const didCopy = await onCopy(values.scope);
    if (didCopy) {
      pop();
    }
  }

  return (
    <Form
      navigationTitle="Export URL-Sets"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Share Code" onSubmit={handleSubmit} />
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="scope"
        title="What to Export"
        value={scope}
        onChange={(value) => setScope(value as ExportScope)}
      >
        {selectedSet && <Form.Dropdown.Item value="selected" title={`Selected Set: ${selectedSet.name}`} />}
        <Form.Dropdown.Item value="all" title={`All Saved Sets (${savedSetsCount})`} />
      </Form.Dropdown>
    </Form>
  );
}

export default function Command() {
  return <MultiUrlSavedSetsList />;
}

export function MultiUrlSavedSetsList() {
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [slots, setSlots] = useState<ShortcutSlots>(DEFAULT_SHORTCUT_SLOTS);
  const [trash, setTrash] = useState<TrashedSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTag, setSelectedTag] = useState<string>(TAG_FILTER_ALL);
  const isOpeningRef = useRef(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [loadedSavedSets, loadedHistory, loadedSlots, loadedTrash] = await Promise.all([
        loadSavedSets(),
        loadHistory(),
        loadShortcutSlots(),
        loadTrash(),
      ]);
      setSavedSets(sortSavedSets(loadedSavedSets));
      setHistory(loadedHistory);
      setSlots(loadedSlots);
      setTrash(sortTrash(loadedTrash));
      setIsLoading(false);
    }

    void loadData();
  }, []);

  const assignedCount = useMemo(() => Object.values(slots).filter(Boolean).length, [slots]);
  const availableTags = useMemo(
    () => Array.from(new Set(savedSets.flatMap((item) => item.tags))).sort((a, b) => a.localeCompare(b)),
    [savedSets],
  );
  const filteredSavedSets = useMemo(
    () => (selectedTag === TAG_FILTER_ALL ? savedSets : savedSets.filter((item) => item.tags.includes(selectedTag))),
    [savedSets, selectedTag],
  );
  const pinnedSets = useMemo(() => filteredSavedSets.filter((item) => item.pinned), [filteredSavedSets]);
  const unpinnedSets = useMemo(() => filteredSavedSets.filter((item) => !item.pinned), [filteredSavedSets]);
  const pinnedCount = useMemo(() => pinnedSets.length, [pinnedSets]);
  const savedSetUrlCounts = useMemo(
    () => new Map(savedSets.map((item) => [item.id, countValidUrls(item.urls)] as const)),
    [savedSets],
  );
  const trashUrlCounts = useMemo(
    () => new Map(trash.map((item) => [item.id, countValidUrls(item.sourceSet.urls)] as const)),
    [trash],
  );
  const activeTagLabel = selectedTag === TAG_FILTER_ALL ? "all tags" : `#${selectedTag}`;

  useEffect(() => {
    if (selectedTag !== TAG_FILTER_ALL && !availableTags.includes(selectedTag)) {
      setSelectedTag(TAG_FILTER_ALL);
    }
  }, [availableTags, selectedTag]);

  async function persistSavedSets(nextSavedSets: SavedSet[]) {
    await saveSavedSets(nextSavedSets);
    setSavedSets(sortSavedSets(nextSavedSets));
  }

  async function withOpenLock(run: () => Promise<void>) {
    if (isOpeningRef.current) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Open already in progress",
        message: "Wait until the current run finishes.",
      });
      return;
    }

    isOpeningRef.current = true;
    try {
      await run();
    } finally {
      isOpeningRef.current = false;
    }
  }

  async function assignSetToSlot(setId: string, slot: ShortcutSlotKey) {
    const freshSlots = await loadShortcutSlots();
    const previousSlot = SLOT_KEYS.find((item) => freshSlots[item] === setId) ?? null;
    const didToggleOff = freshSlots[slot] === setId;
    const nextSlots = toggleSetQuickUrlSlot(freshSlots, setId, slot);
    await saveShortcutSlots(nextSlots);
    setSlots(nextSlots);

    await showToast({
      style: Toast.Style.Success,
      title: didToggleOff ? `${slotLabel(slot)} cleared` : `${slotLabel(slot)} updated`,
      message: didToggleOff
        ? "The saved set was removed from this QuickURL."
        : previousSlot && previousSlot !== slot
          ? `${slotLabel(previousSlot)} was cleared automatically.`
          : "Bind hotkeys to QuickURL #1..#5 in Raycast Settings.",
    });
  }

  async function clearSetFromSlots(setId: string) {
    const freshSlots = await loadShortcutSlots();
    const nextSlots: ShortcutSlots = {
      ...freshSlots,
    };

    for (const slot of SLOT_KEYS) {
      if (nextSlots[slot] === setId) {
        nextSlots[slot] = null;
      }
    }

    await saveShortcutSlots(nextSlots);
    setSlots(nextSlots);

    await showToast({
      style: Toast.Style.Success,
      title: "QuickURL mappings cleared",
    });
  }

  async function clearAllQuickUrlMappings() {
    const freshSlots = await loadShortcutSlots();
    const hasMappings = SLOT_KEYS.some((slot) => freshSlots[slot] !== null);
    if (!hasMappings) {
      return;
    }

    const shouldClear = await confirmAlert({
      title: "Clear all QuickURL mappings?",
      message: "All QuickURL slots will be reset.",
      primaryAction: {
        title: "Clear All Mappings",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldClear) {
      return;
    }

    const nextSlots: ShortcutSlots = {
      ...DEFAULT_SHORTCUT_SLOTS,
    };
    await saveShortcutSlots(nextSlots);
    setSlots(nextSlots);

    await showToast({
      style: Toast.Style.Success,
      title: "All QuickURL mappings cleared",
    });
  }

  async function updateSet(setId: string, values: EditSetFormValues): Promise<boolean> {
    const nextName = values.name.trim();
    if (nextName.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return false;
    }

    const freshSavedSets = await loadSavedSets();
    const duplicate = freshSavedSets.find(
      (item) => item.id !== setId && item.name.toLowerCase() === nextName.toLowerCase(),
    );

    if (duplicate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name already exists",
        message: "Choose a different set name.",
      });
      return false;
    }

    const parsed = parseInputUrls(values.urls);
    if (parsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid URLs to save",
      });
      return false;
    }

    const browserApp = resolveBrowserApp(values.browserChoice, values.customBrowserApp);
    if (values.browserChoice === "custom" && !browserApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom browser is required",
      });
      return false;
    }

    let emoji: string | null = null;
    if (values.emojiChoice === EMOJI_CUSTOM) {
      emoji = normalizeSingleEmoji(values.customEmoji);
      if (!emoji) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick an emoji",
          message: "Choose one from the list or add a custom emoji.",
        });
        return false;
      }
    } else if (values.emojiChoice !== EMOJI_NONE) {
      emoji = normalizeSingleEmoji(values.emojiChoice);
    }

    const tags = parseTagInput(values.tags);
    const normalizedUrls = parsed.uniqueValid.join("\n");
    const now = new Date().toISOString();
    const nextSavedSets = freshSavedSets.map((item) =>
      item.id === setId
        ? {
            ...item,
            name: nextName,
            emoji,
            tags,
            urls: normalizedUrls,
            browserApp,
            updatedAt: now,
          }
        : item,
    );

    await persistSavedSets(nextSavedSets);

    await showToast({
      style: Toast.Style.Success,
      title: "Set updated",
      message: nextName,
    });

    return true;
  }

  async function createSet(values: CreateSetFormValues, options?: CreateSetSubmitOptions): Promise<boolean> {
    const rawName = values.name.trim();
    if (rawName.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return false;
    }

    const parsed = parseInputUrls(values.urls);
    if (parsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid URLs to save",
      });
      return false;
    }

    const browserApp = resolveBrowserApp(values.browserChoice, values.customBrowserApp);
    if (values.browserChoice === "custom" && !browserApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom browser is required",
      });
      return false;
    }

    let emoji: string | null = null;
    if (values.emojiChoice === EMOJI_CUSTOM) {
      emoji = normalizeSingleEmoji(values.customEmoji);
      if (!emoji) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick an emoji",
          message: "Choose one from the list or add a custom emoji.",
        });
        return false;
      }
    } else if (values.emojiChoice !== EMOJI_NONE) {
      emoji = normalizeSingleEmoji(values.emojiChoice);
    }

    const normalizedUrls = parsed.uniqueValid.join("\n");
    const tags = parseTagInput(values.tags);
    const freshSavedSets = await loadSavedSets();
    const resolvedName = createUniqueSetName(
      rawName,
      freshSavedSets.map((item) => item.name),
    );
    const now = new Date().toISOString();

    const nextSet: SavedSet = {
      id: randomUUID(),
      name: resolvedName,
      emoji,
      tags,
      urls: normalizedUrls,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      pinned: false,
      lastOpenedAt: null,
      totalOpenedCount: 0,
      totalFailedCount: 0,
      totalInvalidCount: 0,
      browserApp,
    };

    const nextSavedSets = [nextSet, ...freshSavedSets];
    await persistSavedSets(nextSavedSets);

    if (options?.openAfterSave) {
      if (parsed.uniqueValid.length > MAX_URLS_PER_RUN) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set created, but not opened",
          message: `Safety limit is ${MAX_URLS_PER_RUN} URLs per run.`,
        });
        return true;
      }

      await withOpenLock(async () => {
        await runSavedSet(nextSet, nextSavedSets);
      });
      return true;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Set created",
      message: resolvedName,
    });

    return true;
  }

  async function copyShareCode(scope: ExportScope, selectedSet: SavedSet | null): Promise<boolean> {
    try {
      const shareCode =
        scope === "selected" && selectedSet
          ? createShareCodeFromSavedSet(selectedSet)
          : createShareCodeFromSavedSets(savedSets);
      await Clipboard.copy(shareCode);

      await showToast({
        style: Toast.Style.Success,
        title: "Export copied to clipboard",
        message:
          scope === "selected" && selectedSet
            ? selectedSet.name
            : `${savedSets.length} URL-set${savedSets.length === 1 ? "" : "s"}`,
      });

      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not export URL-sets",
        message: error instanceof Error ? error.message : "Try again when at least one valid set is available.",
      });

      return false;
    }
  }

  async function importSharedSets(rawShareCode: string): Promise<boolean> {
    const freshSavedSets = await loadSavedSets();
    let parsedSharedSets;
    try {
      parsedSharedSets = parseSharedSetsInput(rawShareCode);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not import URL-set",
        message: error instanceof Error ? error.message : "Share code is invalid.",
      });
      return false;
    }

    const existingFingerprints = new Set(freshSavedSets.map((set) => createSavedSetShareFingerprint(set)));
    const nextNames = freshSavedSets.map((set) => set.name);
    const now = new Date().toISOString();
    const importedSets: SavedSet[] = [];
    let skippedDuplicateCount = 0;

    for (const sharedSet of parsedSharedSets) {
      const fingerprint = createSharedSetFingerprint(sharedSet);
      if (existingFingerprints.has(fingerprint)) {
        skippedDuplicateCount += 1;
        continue;
      }

      const resolvedName = createUniqueSetName(sharedSet.name, nextNames);
      nextNames.push(resolvedName);
      existingFingerprints.add(fingerprint);

      importedSets.push({
        id: randomUUID(),
        name: resolvedName,
        emoji: normalizeSingleEmoji(sharedSet.emoji ?? ""),
        tags: parseTagInput(sharedSet.tags.join(", ")),
        urls: sharedSet.urls.join("\n"),
        createdAt: now,
        updatedAt: now,
        useCount: 0,
        pinned: false,
        lastOpenedAt: null,
        totalOpenedCount: 0,
        totalFailedCount: 0,
        totalInvalidCount: 0,
        browserApp: sharedSet.browserApp,
      });
    }

    if (importedSets.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No new URL-sets to import",
        message:
          skippedDuplicateCount > 0
            ? `${skippedDuplicateCount} duplicate URL-set${skippedDuplicateCount === 1 ? "" : "s"} skipped`
            : "Share code did not contain importable URL-sets.",
      });
      return false;
    }

    const shouldImport = await confirmAlert({
      title: `Import ${importedSets.length} URL-set${importedSets.length === 1 ? "" : "s"}?`,
      message:
        skippedDuplicateCount > 0
          ? `${skippedDuplicateCount} duplicate URL-set${skippedDuplicateCount === 1 ? "" : "s"} will be skipped.`
          : undefined,
      primaryAction: {
        title: "Import URL-Set",
      },
    });

    if (!shouldImport) {
      return false;
    }

    const nextSavedSets = [...importedSets, ...freshSavedSets];
    await persistSavedSets(nextSavedSets);

    await showToast({
      style: Toast.Style.Success,
      title: `Imported ${importedSets.length} URL-set${importedSets.length === 1 ? "" : "s"}`,
      message:
        skippedDuplicateCount > 0
          ? `${skippedDuplicateCount} duplicate${skippedDuplicateCount === 1 ? "" : "s"} skipped`
          : undefined,
    });

    return true;
  }

  async function togglePinned(setId: string) {
    const freshSavedSets = await loadSavedSets();
    let isPinned = false;
    const now = new Date().toISOString();
    const nextSavedSets = freshSavedSets.map((item) => {
      if (item.id !== setId) {
        return item;
      }

      isPinned = !item.pinned;
      return {
        ...item,
        pinned: !item.pinned,
        updatedAt: now,
      };
    });

    await persistSavedSets(nextSavedSets);

    await showToast({
      style: Toast.Style.Success,
      title: isPinned ? "Set pinned" : "Set unpinned",
    });
  }

  async function duplicateSet(sourceSet: SavedSet) {
    const freshSavedSets = await loadSavedSets();
    const now = new Date().toISOString();
    const duplicateName = createUniqueSetName(
      `${sourceSet.name} Copy`,
      freshSavedSets.map((item) => item.name),
    );

    const duplicate: SavedSet = {
      ...sourceSet,
      id: randomUUID(),
      name: duplicateName,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
      pinned: false,
      lastOpenedAt: null,
      totalOpenedCount: 0,
      totalFailedCount: 0,
      totalInvalidCount: 0,
    };

    const nextSavedSets = [duplicate, ...freshSavedSets];
    await persistSavedSets(nextSavedSets);

    await showToast({
      style: Toast.Style.Success,
      title: "Set duplicated",
      message: duplicate.name,
    });
  }

  async function mergeIntoSet(sourceSet: SavedSet, targetSet: SavedSet) {
    const sourceParsed = parseInputUrls(sourceSet.urls);
    if (sourceParsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${sourceSet.name} has no valid URLs`,
      });
      return;
    }

    const targetParsed = parseInputUrls(targetSet.urls);
    const mergedUrls = dedupe([...targetParsed.uniqueValid, ...sourceParsed.uniqueValid]);
    if (mergedUrls.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Merged result is empty",
      });
      return;
    }

    const freshSavedSets = await loadSavedSets();
    const now = new Date().toISOString();
    const nextSavedSets = freshSavedSets.map((item) =>
      item.id === targetSet.id
        ? {
            ...item,
            urls: mergedUrls.join("\n"),
            updatedAt: now,
          }
        : item,
    );
    await persistSavedSets(nextSavedSets);

    const addedCount = Math.max(0, mergedUrls.length - targetParsed.uniqueValid.length);
    await showToast({
      style: Toast.Style.Success,
      title: "Sets merged",
      message: `${addedCount} new URL${addedCount === 1 ? "" : "s"} added to ${targetSet.name}.`,
    });
  }

  async function restoreTrashedSet(trashId: string) {
    const [currentSavedSets, currentSlots, currentTrash] = await Promise.all([
      loadSavedSets(),
      loadShortcutSlots(),
      loadTrash(),
    ]);

    const target = currentTrash.find((item) => item.id === trashId);
    if (!target) {
      return;
    }

    const now = new Date().toISOString();
    const existingIds = new Set(currentSavedSets.map((item) => item.id));
    const restoredId = existingIds.has(target.sourceSet.id) ? randomUUID() : target.sourceSet.id;
    const restoredName = createUniqueSetName(
      target.sourceSet.name,
      currentSavedSets.map((item) => item.name),
    );

    const restoredSet: SavedSet = {
      ...target.sourceSet,
      id: restoredId,
      name: restoredName,
      updatedAt: now,
    };

    const nextSlots: ShortcutSlots = {
      ...currentSlots,
    };
    let restoredSlotCount = 0;
    for (const slot of target.previousSlots) {
      if (!nextSlots[slot]) {
        nextSlots[slot] = restoredId;
        restoredSlotCount += 1;
      }
    }

    const nextSavedSets = sortSavedSets([restoredSet, ...currentSavedSets]);
    const nextTrash = sortTrash(currentTrash.filter((item) => item.id !== target.id));

    await Promise.all([saveSavedSets(nextSavedSets), saveShortcutSlots(nextSlots), saveTrash(nextTrash)]);

    setSavedSets(nextSavedSets);
    setSlots(nextSlots);
    setTrash(nextTrash);

    await showToast({
      style: Toast.Style.Success,
      title: "Set restored",
      message:
        restoredSlotCount > 0
          ? `${restoredName} (${restoredSlotCount} QuickURL mapping${restoredSlotCount === 1 ? "" : "s"} restored)`
          : restoredName,
    });
  }

  async function permanentlyDeleteTrashedSet(entry: TrashedSet) {
    const shouldDelete = await confirmAlert({
      title: `Delete ${entry.sourceSet.name} forever?`,
      message: "This cannot be undone.",
      primaryAction: {
        title: "Delete Permanently",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDelete) {
      return;
    }

    const freshTrash = await loadTrash();
    const nextTrash = sortTrash(freshTrash.filter((item) => item.id !== entry.id));
    await saveTrash(nextTrash);
    setTrash(nextTrash);

    await showToast({
      style: Toast.Style.Success,
      title: "Deleted permanently",
    });
  }

  async function clearTrash() {
    const freshTrash = await loadTrash();
    if (freshTrash.length === 0) {
      return;
    }

    const shouldClear = await confirmAlert({
      title: "Clear all trash?",
      message: "All trashed sets will be deleted permanently.",
      primaryAction: {
        title: "Clear Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldClear) {
      return;
    }

    await saveTrash([]);
    setTrash([]);

    await showToast({
      style: Toast.Style.Success,
      title: "Trash cleared",
    });
  }

  async function deleteSet(savedSet: SavedSet) {
    const shouldDelete = await confirmAlert({
      title: `Move ${savedSet.name} to trash?`,
      message: "The set will be removed from active lists and can be restored from Trash.",
      primaryAction: {
        title: "Move to Trash",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!shouldDelete) {
      return;
    }

    const [freshSavedSets, freshSlots, freshTrash] = await Promise.all([
      loadSavedSets(),
      loadShortcutSlots(),
      loadTrash(),
    ]);
    const now = new Date().toISOString();
    const previousSlots = getAssignedSlots(freshSlots, savedSet.id);
    const trashEntry: TrashedSet = {
      id: randomUUID(),
      deletedAt: now,
      sourceSet: savedSet,
      previousSlots,
    };

    const nextSavedSets = freshSavedSets.filter((item) => item.id !== savedSet.id);
    const nextSlots: ShortcutSlots = {
      ...freshSlots,
    };
    for (const slot of SLOT_KEYS) {
      if (nextSlots[slot] === savedSet.id) {
        nextSlots[slot] = null;
      }
    }

    const nextTrash = sortTrash([trashEntry, ...freshTrash]).slice(0, MAX_TRASH_ITEMS);

    await Promise.all([saveSavedSets(nextSavedSets), saveShortcutSlots(nextSlots), saveTrash(nextTrash)]);

    setSavedSets(sortSavedSets(nextSavedSets));
    setSlots(nextSlots);
    setTrash(nextTrash);

    await showToast({
      style: Toast.Style.Success,
      title: "Set moved to trash",
      message: savedSet.name,
      primaryAction: {
        title: "Undo",
        onAction: () => {
          void restoreTrashedSet(trashEntry.id);
        },
      },
    });
  }

  async function runSavedSet(savedSet: SavedSet, baseSavedSets?: SavedSet[]) {
    const parsed = parseInputUrls(savedSet.urls);

    if (parsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid URLs in selected set",
      });
      return;
    }

    if (parsed.uniqueValid.length > MAX_URLS_PER_RUN) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Too many URLs",
        message: `Safety limit is ${MAX_URLS_PER_RUN} URLs per run.`,
      });
      return;
    }

    await closeMainWindow();

    const openFailures = await openInBrowser(parsed.uniqueValid, savedSet.browserApp);
    const openedCount = parsed.uniqueValid.length - openFailures.length;
    const now = new Date().toISOString();
    const [freshSavedSets, freshHistory] = await Promise.all([loadSavedSets(), loadHistory()]);
    const savedSetsToUpdate = freshSavedSets.some((item) => item.id === savedSet.id)
      ? freshSavedSets
      : baseSavedSets && baseSavedSets.some((item) => item.id === savedSet.id)
        ? baseSavedSets
        : [savedSet, ...freshSavedSets];
    const nextSavedSets = savedSetsToUpdate.map((item) =>
      item.id === savedSet.id
        ? applySavedSetRunStats(
            item,
            {
              openedCount,
              failedCount: openFailures.length,
              invalidCount: parsed.invalid.length,
            },
            now,
          )
        : item,
    );

    const nextHistory: HistoryEntry[] = [
      {
        id: randomUUID(),
        urls: parsed.uniqueValid.join("\n"),
        createdAt: now,
        openedCount,
        invalidCount: parsed.invalid.length,
        failedCount: openFailures.length,
        sourceName: savedSet.name,
        sourceSetId: savedSet.id,
        browserApp: savedSet.browserApp,
      },
      ...freshHistory,
    ].slice(0, MAX_HISTORY_ITEMS);

    await Promise.all([saveSavedSets(nextSavedSets), saveHistory(nextHistory)]);

    setSavedSets(sortSavedSets(nextSavedSets));
    setHistory(nextHistory);

    if (openFailures.length > 0 || parsed.invalid.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened ${openedCount}/${parsed.uniqueValid.length} URLs`,
        message: [
          parsed.invalid.length > 0 ? `${parsed.invalid.length} invalid` : "",
          openFailures.length > 0 ? `${openFailures.length} failed` : "",
        ]
          .filter(Boolean)
          .join(" • "),
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Opened ${openedCount} URLs`,
      message: savedSet.name,
    });
  }

  async function openSavedSet(savedSet: SavedSet) {
    await withOpenLock(async () => {
      await runSavedSet(savedSet);
    });
  }

  async function openHistoryEntry(entry: HistoryEntry) {
    await withOpenLock(async () => {
      const parsed = parseInputUrls(entry.urls);
      if (parsed.uniqueValid.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No valid URLs in history entry",
        });
        return;
      }

      if (parsed.uniqueValid.length > MAX_URLS_PER_RUN) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Too many URLs",
          message: `Safety limit is ${MAX_URLS_PER_RUN} URLs per run.`,
        });
        return;
      }

      await closeMainWindow();

      const openFailures = await openInBrowser(parsed.uniqueValid, entry.browserApp);
      const openedCount = parsed.uniqueValid.length - openFailures.length;
      const now = new Date().toISOString();
      const [freshSavedSets, freshHistory] = await Promise.all([loadSavedSets(), loadHistory()]);

      const nextHistory: HistoryEntry[] = [
        {
          id: randomUUID(),
          urls: parsed.uniqueValid.join("\n"),
          createdAt: now,
          openedCount,
          invalidCount: parsed.invalid.length,
          failedCount: openFailures.length,
          sourceName: entry.sourceName ?? "Recent Run",
          sourceSetId: entry.sourceSetId,
          browserApp: entry.browserApp,
        },
        ...freshHistory,
      ].slice(0, MAX_HISTORY_ITEMS);

      let nextSavedSets = freshSavedSets;
      if (entry.sourceSetId) {
        nextSavedSets = freshSavedSets.map((item) =>
          item.id === entry.sourceSetId
            ? applySavedSetRunStats(
                item,
                {
                  openedCount,
                  failedCount: openFailures.length,
                  invalidCount: parsed.invalid.length,
                },
                now,
              )
            : item,
        );
      }

      await Promise.all([
        saveHistory(nextHistory),
        entry.sourceSetId ? saveSavedSets(nextSavedSets) : Promise.resolve(),
      ]);

      setHistory(nextHistory);
      if (entry.sourceSetId) {
        setSavedSets(sortSavedSets(nextSavedSets));
      }

      if (openFailures.length > 0 || parsed.invalid.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Opened ${openedCount}/${parsed.uniqueValid.length} URLs`,
          message: [
            parsed.invalid.length > 0 ? `${parsed.invalid.length} invalid` : "",
            openFailures.length > 0 ? `${openFailures.length} failed` : "",
          ]
            .filter(Boolean)
            .join(" • "),
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: `Opened ${openedCount} URLs`,
      });
    });
  }

  function renderCreateSetAction() {
    return (
      <Action.Push
        title="Create New Set"
        icon={Icon.Plus}
        target={<CreateSetForm onSubmit={createSet} />}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
      />
    );
  }

  function renderCreateFromClipboardAction() {
    return (
      <Action
        title="Create from Clipboard"
        icon={Icon.CopyClipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={() =>
          void launchCommand({
            name: "new-set-from-clipboard",
            type: LaunchType.UserInitiated,
          })
        }
      />
    );
  }

  function renderImportSetAction() {
    return (
      <Action.Push
        title="Import URL-Set"
        icon={Icon.ArrowClockwise}
        target={<ImportSharedSetForm onSubmit={importSharedSets} />}
      />
    );
  }

  function renderExportSetAction(selectedSet: SavedSet | null) {
    if (savedSets.length === 0) {
      return null;
    }

    return (
      <Action.Push
        title="Export URL-Set"
        icon={Icon.CopyClipboard}
        target={
          <ExportUrlSetsForm
            selectedSet={selectedSet}
            savedSetsCount={savedSets.length}
            onCopy={(scope) => copyShareCode(scope, selectedSet)}
          />
        }
      />
    );
  }

  function renderSavedSetItem(savedSet: SavedSet) {
    const setSlots = getAssignedSlots(slots, savedSet.id);
    const slotText = setSlots.map((slot) => slotLabel(slot)).join(", ");
    const tagText = formatTagAccessory(savedSet.tags);
    const mergeTargets = savedSets.filter((item) => item.id !== savedSet.id);
    const setIcon = savedSet.emoji ? { source: savedSet.emoji } : savedSet.pinned ? Icon.Star : Icon.Link;

    return (
      <List.Item
        key={savedSet.id}
        icon={setIcon}
        title={savedSet.name}
        subtitle={`${savedSetUrlCounts.get(savedSet.id) ?? 0} URLs • ${savedSet.browserApp ?? "Default browser"}`}
        accessories={[
          ...(tagText ? [{ text: tagText }] : []),
          ...(slotText.length > 0 ? [{ text: slotText }] : []),
          { text: `${savedSet.useCount} opens` },
          {
            text: savedSet.lastOpenedAt ? formatDateTime(savedSet.lastOpenedAt) : "Never opened",
          },
        ]}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="MAIN ACTIONS">
              <Action title="Open Set" icon={Icon.Play} onAction={() => void openSavedSet(savedSet)} />
              {renderCreateSetAction()}
              {renderCreateFromClipboardAction()}
            </ActionPanel.Section>
            <ActionPanel.Section title="EDIT URL-SET">
              <Action.Push
                title="Edit Set"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditSetForm savedSet={savedSet} onSave={updateSet} />}
              />
              <Action
                title={savedSet.pinned ? "Unpin Set" : "Pin Set"}
                icon={Icon.Star}
                shortcut={
                  savedSet.pinned ? { modifiers: ["cmd", "shift"], key: "p" } : { modifiers: ["cmd", "opt"], key: "p" }
                }
                onAction={() => void togglePinned(savedSet.id)}
              />
              <Action
                title="Duplicate Set"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => void duplicateSet(savedSet)}
              />
              {mergeTargets.length > 0 && (
                <ActionPanel.Submenu
                  title="Merge Set"
                  icon={Icon.ArrowRight}
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                >
                  {mergeTargets.map((targetSet) => (
                    <Action
                      key={`${savedSet.id}-${targetSet.id}`}
                      title={targetSet.name}
                      onAction={() => void mergeIntoSet(savedSet, targetSet)}
                    />
                  ))}
                </ActionPanel.Submenu>
              )}
              <Action.Push
                title="View Set Stats"
                icon={Icon.Info}
                shortcut={{ modifiers: ["cmd", "shift", "opt"], key: "s" }}
                target={<SetStatsDetail savedSet={savedSet} />}
              />
              <Action
                title="Move Set to Trash"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => void deleteSet(savedSet)}
              />
            </ActionPanel.Section>
            <ActionPanel.Section title="QUICKURL">
              <ActionPanel.Submenu
                title="Map Selected to QuickURL"
                icon={Icon.Keyboard}
                shortcut={{ modifiers: ["cmd"], key: "u" }}
              >
                {SLOT_KEYS.map((slot) => (
                  <Action
                    key={`${savedSet.id}-${slot}`}
                    title={slots[slot] === savedSet.id ? `Remove from ${slotLabel(slot)}` : `Map to ${slotLabel(slot)}`}
                    onAction={() => void assignSetToSlot(savedSet.id, slot)}
                  />
                ))}
              </ActionPanel.Submenu>
              {setSlots.length > 0 && (
                <Action
                  title="Clear Selected QuickURL"
                  icon={Icon.XMarkCircle}
                  onAction={() => void clearSetFromSlots(savedSet.id)}
                />
              )}
              {assignedCount > 0 && (
                <Action
                  title="Clear All QuickURL Mappings"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void clearAllQuickUrlMappings()}
                />
              )}
            </ActionPanel.Section>
            <ActionPanel.Section title="SETTINGS">
              {renderExportSetAction(savedSet)}
              {renderImportSetAction()}
              <Action
                title="Open Extension Settings"
                icon={Icon.Gear}
                shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                onAction={() => void openExtensionPreferences()}
              />
              <MultiUrlHelpAction />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved sets, trash, or recent runs"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={selectedTag} onChange={setSelectedTag}>
          <List.Dropdown.Item value={TAG_FILTER_ALL} title="All Tags" />
          {availableTags.map((tag) => (
            <List.Dropdown.Item key={`tag-filter-${tag}`} value={tag} title={`#${tag}`} />
          ))}
        </List.Dropdown>
      }
    >
      {pinnedSets.length > 0 && (
        <List.Section title={`Pinned Sets (${pinnedSets.length})`}>{pinnedSets.map(renderSavedSetItem)}</List.Section>
      )}

      {unpinnedSets.length > 0 && (
        <List.Section
          title={`Saved Sets (${unpinnedSets.length})`}
          subtitle={`${assignedCount}/5 QuickURLs • ${pinnedCount} pinned • ${activeTagLabel}`}
        >
          {unpinnedSets.map(renderSavedSetItem)}
        </List.Section>
      )}

      {history.length > 0 && (
        <List.Section title={`Recent Runs (${history.length})`}>
          {history.map((entry) => (
            <List.Item
              key={entry.id}
              icon={Icon.Clock}
              title={entry.sourceName ?? "Recent Run"}
              subtitle={`${entry.openedCount} opened • ${entry.browserApp ?? "Default browser"}`}
              accessories={[{ text: formatDateTime(entry.createdAt) }]}
              actions={
                <ActionPanel>
                  {renderCreateSetAction()}
                  {renderCreateFromClipboardAction()}
                  <Action title="Open Again" icon={Icon.ArrowClockwise} onAction={() => void openHistoryEntry(entry)} />
                  {renderExportSetAction(null)}
                  {renderImportSetAction()}
                  <MultiUrlHelpAction />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {trash.length > 0 && (
        <List.Section title={`Trash (${trash.length})`}>
          {trash.map((entry) => (
            <List.Item
              key={entry.id}
              icon={Icon.Trash}
              title={entry.sourceSet.name}
              subtitle={`${trashUrlCounts.get(entry.id) ?? 0} URLs • deleted ${formatDateTime(entry.deletedAt)}`}
              actions={
                <ActionPanel>
                  {renderCreateSetAction()}
                  {renderCreateFromClipboardAction()}
                  <Action
                    title="Restore Set"
                    icon={Icon.ArrowClockwise}
                    onAction={() => void restoreTrashedSet(entry.id)}
                  />
                  <Action
                    title="Delete Permanently"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => void permanentlyDeleteTrashedSet(entry)}
                  />
                  {trash.length > 1 && (
                    <Action
                      title="Clear Trash"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => void clearTrash()}
                    />
                  )}
                  {renderExportSetAction(null)}
                  {renderImportSetAction()}
                  <MultiUrlHelpAction />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {savedSets.length === 0 && history.length === 0 && trash.length === 0 && (
        <List.EmptyView
          icon={Icon.Link}
          title="No Saved Sets Yet"
          description="Create your first set to start opening multiple URLs quickly."
          actions={
            <ActionPanel>
              {renderCreateSetAction()}
              {renderCreateFromClipboardAction()}
              <Action
                title="Open Extension Settings"
                icon={Icon.Gear}
                onAction={() => void openExtensionPreferences()}
              />
              {renderImportSetAction()}
              <MultiUrlHelpAction />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
