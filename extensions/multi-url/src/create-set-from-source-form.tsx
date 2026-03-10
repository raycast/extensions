import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  Keyboard,
  LaunchType,
  launchCommand,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  applySavedSetRunStats,
  createUniqueSetName,
  ensureSetName,
  formatSetTimestamp,
  HistoryEntry,
  KNOWN_BROWSER_APPS,
  loadHistory,
  loadSavedSets,
  MAX_HISTORY_ITEMS,
  MAX_URLS_PER_RUN,
  normalizeSingleEmoji,
  openInBrowser,
  parseInputUrls,
  parseTagInput,
  QUICK_EMOJI_OPTIONS,
  resolveBrowserApp,
  saveHistory,
  saveSavedSets,
  SavedSet,
  sortSavedSets,
} from "./shared";
import { MultiUrlHelpAction } from "./multi-url-help";
import { MultiUrlSavedSetsList } from "./multi-url-saved-sets";

const EMOJI_NONE = "__none__";
const EMOJI_CUSTOM = "__custom__";

type FormValues = {
  setName?: string;
  tags?: string;
  urls?: string;
  browserChoice?: string;
  customBrowserApp?: string;
  emojiChoice?: string;
  customEmoji?: string;
};

export type SourceLoaderResult = {
  sourceLabel: string;
  rawInput: string;
  suggestedName?: string;
};

type CreateSetFromSourceFormProps = {
  navigationTitle: string;
  loadSource: () => Promise<SourceLoaderResult>;
};

type SubmitOptions = {
  openAfterSave?: boolean;
};

function fallbackSetName(sourceLabel: string): string {
  return `${sourceLabel} ${formatSetTimestamp(new Date())}`;
}

export function CreateSetFromSourceForm({ navigationTitle, loadSource }: CreateSetFromSourceFormProps) {
  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("Source");
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceInvalidCount, setSourceInvalidCount] = useState(0);

  const [setName, setSetName] = useState("");
  const [tags, setTags] = useState("");
  const [urls, setUrls] = useState("");
  const [browserChoice, setBrowserChoice] = useState("default");
  const [customBrowserApp, setCustomBrowserApp] = useState("");
  const [emojiChoice, setEmojiChoice] = useState(EMOJI_NONE);
  const [customEmoji, setCustomEmoji] = useState("");

  const parsedCurrentUrls = useMemo(() => parseInputUrls(urls), [urls]);
  const validUrlCount = parsedCurrentUrls.uniqueValid.length;
  const invalidUrlCount = parsedCurrentUrls.invalid.length;

  const sourceSummary = useMemo(() => {
    if (sourceError) {
      return sourceError;
    }

    if (isLoadingSource) {
      return "Loading URLs from source...";
    }

    const parts = [`Loaded from ${sourceLabel}.`, `${validUrlCount} valid URL${validUrlCount === 1 ? "" : "s"} ready.`];

    if (sourceInvalidCount > 0) {
      parts.push(
        `${sourceInvalidCount} invalid entr${sourceInvalidCount === 1 ? "y was" : "ies were"} skipped during import.`,
      );
    }

    if (invalidUrlCount > 0) {
      parts.push(
        `${invalidUrlCount} entr${invalidUrlCount === 1 ? "y is" : "ies are"} still invalid in the current field.`,
      );
    }

    return parts.join(" ");
  }, [invalidUrlCount, isLoadingSource, sourceError, sourceInvalidCount, sourceLabel, validUrlCount]);

  const refreshSource = useCallback(async () => {
    setIsLoadingSource(true);
    setSourceError(null);

    try {
      const source = await loadSource();
      const parsed = parseInputUrls(source.rawInput);

      if (parsed.uniqueValid.length === 0) {
        throw new Error(`No valid URLs found in ${source.sourceLabel.toLowerCase()}.`);
      }

      setSourceLabel(source.sourceLabel);
      setSourceInvalidCount(parsed.invalid.length);
      setUrls(parsed.uniqueValid.join("\n"));
      setSetName(source.suggestedName?.trim() || fallbackSetName(source.sourceLabel));
      setBrowserChoice("default");
      setCustomBrowserApp("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load URLs from source.";
      setSourceError(message);
      setSourceInvalidCount(0);
      setUrls("");
      setBrowserChoice("default");
      setCustomBrowserApp("");
    } finally {
      setIsLoadingSource(false);
    }
  }, [loadSource]);

  useEffect(() => {
    void refreshSource();
  }, [refreshSource]);

  async function openCreatedSet(savedSet: SavedSet, baseSavedSets: SavedSet[]) {
    const parsed = parseInputUrls(savedSet.urls);
    await closeMainWindow();

    const openFailures = await openInBrowser(parsed.uniqueValid, savedSet.browserApp);
    const openedCount = parsed.uniqueValid.length - openFailures.length;
    const now = new Date().toISOString();
    const nextSavedSets = baseSavedSets.map((item) =>
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
    const history = await loadHistory();
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
      ...history,
    ].slice(0, MAX_HISTORY_ITEMS);

    await Promise.all([saveSavedSets(nextSavedSets), saveHistory(nextHistory)]);

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

  async function handleCreateSet(values: FormValues, options?: SubmitOptions) {
    const resolvedSetName = values.setName ?? setName;
    const resolvedTags = values.tags ?? tags;
    const resolvedUrls = values.urls ?? urls;
    const resolvedBrowserChoice = values.browserChoice ?? browserChoice;
    const resolvedCustomBrowserApp = values.customBrowserApp ?? customBrowserApp;
    const resolvedEmojiChoice = values.emojiChoice ?? emojiChoice;
    const resolvedCustomEmoji = values.customEmoji ?? customEmoji;

    const parsed = parseInputUrls(resolvedUrls);
    if (parsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No valid URLs to save",
      });
      return;
    }

    const browserApp = resolveBrowserApp(resolvedBrowserChoice, resolvedCustomBrowserApp);
    if (resolvedBrowserChoice === "custom" && !browserApp) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Custom browser is required",
      });
      return;
    }

    let emoji: string | null = null;
    if (resolvedEmojiChoice === EMOJI_CUSTOM) {
      emoji = normalizeSingleEmoji(resolvedCustomEmoji);
      if (!emoji) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Pick an emoji",
          message: "Choose one from the list or add a custom emoji.",
        });
        return;
      }
    } else if (resolvedEmojiChoice !== EMOJI_NONE) {
      emoji = normalizeSingleEmoji(resolvedEmojiChoice);
    }

    const savedSets = await loadSavedSets();
    const preferredName = ensureSetName(resolvedSetName);
    const nextName = createUniqueSetName(
      preferredName,
      savedSets.map((item) => item.name),
    );
    const now = new Date().toISOString();

    const nextSet: SavedSet = {
      id: randomUUID(),
      name: nextName,
      emoji,
      tags: parseTagInput(resolvedTags),
      urls: parsed.uniqueValid.join("\n"),
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

    const nextSavedSets = sortSavedSets([nextSet, ...savedSets]);
    await saveSavedSets(nextSavedSets);
    setSetName(nextSet.name);
    setUrls(nextSet.urls);

    if (options?.openAfterSave) {
      if (parsed.uniqueValid.length > MAX_URLS_PER_RUN) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Set created, but not opened",
          message: `Safety limit is ${MAX_URLS_PER_RUN} URLs per run.`,
        });
        await launchCommand({
          name: "multi-url",
          type: LaunchType.UserInitiated,
        });
        return;
      }

      await openCreatedSet(nextSet, nextSavedSets);
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Set created",
      message:
        nextName === preferredName
          ? `${nextSet.name} (${parsed.uniqueValid.length} URLs)`
          : `${nextSet.name} (${parsed.uniqueValid.length} URLs, renamed to avoid duplicate)`,
    });

    await launchCommand({
      name: "multi-url",
      type: LaunchType.UserInitiated,
    });
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      isLoading={isLoadingSource}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Set" onSubmit={handleCreateSet} />
          <Action.SubmitForm
            title="Save Set and Open Links"
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(values) => handleCreateSet(values, { openAfterSave: true })}
          />
          <Action
            title="Reload Source URLs"
            onAction={() => void refreshSource()}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.Push title="Open Saved Sets" target={<MultiUrlSavedSetsList />} />
          <Action title="Open Extension Settings" onAction={() => void openExtensionPreferences()} />
          <MultiUrlHelpAction />
        </ActionPanel>
      }
    >
      <Form.Description text={sourceSummary} />

      <Form.TextField
        id="setName"
        title="Name"
        value={setName}
        onChange={setSetName}
        placeholder="Example: Morning Links"
      />

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
