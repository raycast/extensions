import { Action, ActionPanel, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { ManageProviders } from "./manage-providers";
import { ChooseModel } from "./choose-model";
import {
  currentTranslation,
  emptyViewContent,
  formatClipboardPreview,
  formatDetailMarkdown,
  translationKey,
} from "./core/detail";
import {
  clipboardPreview,
  describeInputSource,
  initialSearchText,
  queryFor,
  requestQuery,
  searchPlaceholder,
  sourceOfSubmission,
  TYPING_DELAY_MS,
  type InitialInput,
} from "./core/input";
import { applyModelChoices } from "./core/models";
import { InvalidSettingsError } from "./core/errors";
import { confirmationMessage, outputActions, type PrimaryAction } from "./core/output";
import { keyPageLinks, PROVIDERS, providersAfter, type ProviderConfig } from "./core/providers";
import {
  formatDirection,
  resolveTarget,
  swapTarget,
  targetOptions,
  targetValue,
  type TranslationTarget,
} from "./core/target";
import { isToneId, TONE_IDS, TONES, type ToneId } from "./core/tones";
import { translate, visibleTranslation, type TranslationResult } from "./core/translate";
import { formatUsage, loadProviderUsage, summarizeProviderUsage } from "./core/usage";
import { showTranslationError } from "./raycast/feedback";
import { readInitialInput } from "./raycast/input";
import { deliverTranslation } from "./raycast/output";
import { loadSettings, type Settings } from "./raycast/settings";
import { SettingsErrorView } from "./raycast/settings-error";
import { localStore } from "./raycast/storage";

const OUTPUT_TITLES: Readonly<Record<PrimaryAction, string>> = {
  paste: "Paste to Active App",
  copy: "Copy Translation",
};

const OUTPUT_ICONS: Readonly<Record<PrimaryAction, Icon>> = {
  paste: Icon.Clipboard,
  copy: Icon.CopyClipboard,
};

const NO_PROVIDERS: readonly ProviderConfig[] = [];

export default function TranslateCommand() {
  const { data: settings, error, revalidate } = usePromise(loadSettings, []);
  if (error) {
    if (!(error instanceof InvalidSettingsError)) {
      throw error;
    }
    return <SettingsErrorView error={error} />;
  }
  return settings ? (
    <Translate settings={settings} onSettingsChange={() => void revalidate()} />
  ) : (
    <List isLoading />
  );
}

function Translate({
  settings,
  onSettingsChange,
}: {
  readonly settings: Settings;
  readonly onSettingsChange: () => void;
}) {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [submittedClipboard, setSubmittedClipboard] = useState<string | undefined>(undefined);
  const [initialInput, setInitialInput] = useState<InitialInput>({ text: "", source: "none" });
  const [selectedTarget, setSelectedTarget] = useState(targetValue(settings.target));
  const [tone, setTone] = useCachedState<ToneId>("tone", settings.defaultTone);

  const { isLoading: isReadingInput } = usePromise(readInitialInput, [], {
    onData: (input) => {
      const searchText = initialSearchText(input);
      setInitialInput(input);
      setText(searchText);
      setQuery(queryFor(input, searchText, undefined));
    },
  });

  useEffect(() => {
    const timer = setTimeout(
      () => setQuery(queryFor(initialInput, text, submittedClipboard)),
      TYPING_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [text, initialInput, submittedClipboard]);

  const target = useMemo(
    () => resolveTarget(selectedTarget, settings.target),
    [selectedTarget, settings.target],
  );
  const { data: providers } = usePromise(
    (configured: readonly ProviderConfig[]) => applyModelChoices(localStore, configured),
    [settings.providers],
  );
  const currentQuery = queryFor(initialInput, text, submittedClipboard);
  const translation = useTranslation(
    providers ? requestQuery(currentQuery, query) : "",
    currentQuery,
    target,
    tone,
    providers ?? NO_PROVIDERS,
  );
  const { data: providerUsage } = usePromise(
    (active: readonly ProviderConfig[]) => loadProviderUsage(localStore, active, new Date()),
    [providers ?? NO_PROVIDERS],
  );
  const empty = emptyViewContent(
    settings.providers.length,
    providerUsage ? summarizeProviderUsage(providerUsage) : undefined,
  );
  const hasQuery = query.trim() !== "" && !empty.needsSetup;
  const preview = empty.needsSetup
    ? undefined
    : clipboardPreview(initialInput, text, submittedClipboard);
  const sourceLabel = describeInputSource(sourceOfSubmission(initialInput, query));

  const { result } = translation;
  const pane = (
    <List.Item.Detail
      markdown={
        preview !== undefined
          ? formatClipboardPreview(preview)
          : formatDetailMarkdown({
              translation: translation.visibleText,
              original: query.trim(),
              sourceLabel,
              failed: translation.failed,
            })
      }
      metadata={result ? <TranslationMetadata result={result} target={target} /> : undefined}
    />
  );

  const actions = (
    <ActionPanel>
      {preview !== undefined ? (
        <Action
          title="Translate Clipboard"
          icon={Icon.Globe}
          onAction={() => {
            setSubmittedClipboard(preview);
            setQuery(preview);
          }}
        />
      ) : null}
      {result ? (
        <ActionPanel.Section>
          {outputActions(settings.primaryAction).map((action) => (
            <OutputActionItem key={action} action={action} result={result} />
          ))}
        </ActionPanel.Section>
      ) : null}
      <ActionPanel.Section>
        <Action
          title="Swap Direction"
          icon={Icon.Switch}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => setSelectedTarget(targetValue(swapTarget(result?.direction, target)))}
        />
        {translation.failed ? (
          <Action
            title="Retry"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={translation.retry}
          />
        ) : null}
        {result && settings.providers.length > 1 ? (
          <Action
            title="Retry with Next Provider"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={translation.retryWithNextProvider}
          />
        ) : null}
        {hasQuery ? (
          <Action.CopyToClipboard
            title="Copy Original"
            content={query.trim()}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        ) : null}
        <Action.Push
          title="Choose Model…"
          icon={Icon.ComputerChip}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          target={<ChooseModel onChange={onSettingsChange} />}
        />
        <Action.Push
          title="Manage Providers"
          icon={Icon.Key}
          target={<ManageProviders onChange={onSettingsChange} />}
        />
        <Action
          title="Open Preferences"
          icon={Icon.Gear}
          onAction={() => void openExtensionPreferences()}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const setupActions = (
    <ActionPanel>
      <Action.Push
        title="Manage Providers"
        icon={Icon.Key}
        target={<ManageProviders onChange={onSettingsChange} />}
      />
      {keyPageLinks().map(({ title, url }) => (
        <Action.OpenInBrowser key={url} title={title} url={url} />
      ))}
    </ActionPanel>
  );

  return (
    <List
      isLoading={isReadingInput || translation.isLoading}
      isShowingDetail={hasQuery || preview !== undefined}
      filtering={false}
      searchText={text}
      onSearchTextChange={(value) => {
        setSubmittedClipboard(undefined);
        setText(value);
      }}
      searchBarPlaceholder={searchPlaceholder(initialInput)}
      selectedItemId={tone}
      onSelectionChange={(id) => {
        if (id !== null && isToneId(id)) {
          setTone(id);
        }
      }}
      searchBarAccessory={
        <List.Dropdown tooltip="Translate To" value={selectedTarget} onChange={setSelectedTarget}>
          {targetOptions(settings.target).map((option) => (
            <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
          ))}
        </List.Dropdown>
      }
    >
      {hasQuery || preview !== undefined ? (
        <List.Section title="Tone">
          {TONE_IDS.map((id) => (
            <List.Item
              key={id}
              id={id}
              title={TONES[id].title}
              subtitle={TONES[id].summary}
              detail={pane}
              actions={actions}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={empty.needsSetup ? Icon.Key : Icon.Globe}
          title={empty.title}
          description={empty.description}
          actions={empty.needsSetup ? setupActions : actions}
        />
      )}
    </List>
  );
}

interface OutputActionItemProps {
  readonly action: PrimaryAction;
  readonly result: TranslationResult;
}

function OutputActionItem({ action, result }: OutputActionItemProps) {
  return (
    <Action
      title={OUTPUT_TITLES[action]}
      icon={OUTPUT_ICONS[action]}
      onAction={() =>
        void deliverTranslation(
          action,
          result.text,
          confirmationMessage(action, { providerId: result.provider.id, skipped: result.skipped }),
        )
      }
    />
  );
}

interface TranslationMetadataProps {
  readonly result: TranslationResult;
  readonly target: TranslationTarget;
}

function TranslationMetadata({ result, target }: TranslationMetadataProps) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label
        title="Direction"
        text={formatDirection(result.direction, target)}
      />
      <List.Item.Detail.Metadata.Label
        title="Provider"
        text={`${PROVIDERS[result.provider.id].name} · ${result.provider.model}`}
      />
      <List.Item.Detail.Metadata.Label title="Usage" text={formatUsage(result.usage)} />
      <List.Item.Detail.Metadata.Label title="Duration" text={`${result.durationMs} ms`} />
      {result.skipped.length > 0 ? (
        <List.Item.Detail.Metadata.TagList title="Skipped">
          {result.skipped.map((failure) => (
            <List.Item.Detail.Metadata.TagList.Item key={failure.provider} text={failure.summary} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
    </List.Item.Detail.Metadata>
  );
}

interface Streamed {
  readonly key: string;
  readonly text: string;
}

interface Attempt {
  readonly key: string;
  readonly providers: readonly ProviderConfig[];
}

function useTranslation(
  query: string,
  currentQuery: string,
  target: TranslationTarget,
  tone: ToneId,
  providers: readonly ProviderConfig[],
) {
  const [cache, setCache] = useState<ReadonlyMap<string, TranslationResult>>(new Map());
  const [streamed, setStreamed] = useState<Streamed>({ key: "", text: "" });
  const [lastResult, setLastResult] = useState<TranslationResult | undefined>(undefined);
  const [failedKey, setFailedKey] = useState<string | undefined>(undefined);
  const [retry, setRetry] = useState<Attempt | undefined>(undefined);

  const key = translationKey(query, target, tone, providers);
  const currentKey = translationKey(currentQuery, target, tone, providers);
  const retrying = retry?.key === key ? retry : undefined;
  const cached = retrying ? undefined : cache.get(key);
  const isLoading = query.trim() !== "" && cached === undefined && failedKey !== key;
  const result = currentTranslation(cached, key, currentKey);
  const displayed = cached ?? (isLoading ? lastResult : undefined);

  useEffect(() => {
    if (!isLoading) {
      return undefined;
    }
    const controller = new AbortController();
    translate(
      {
        text: query,
        tone,
        target,
        signal: controller.signal,
        onPartial: (partial) => setStreamed({ key, text: partial.text }),
      },
      { providers: retrying?.providers ?? providers, store: localStore, fetch },
    ).then(
      (translated) => {
        if (controller.signal.aborted) {
          return undefined;
        }
        setCache((previous) => new Map(previous).set(key, translated));
        setLastResult(translated);
        setRetry(undefined);
        return translated;
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setFailedKey(key);
          void showTranslationError(
            error,
            {
              command: "translate",
              tone,
              targetLanguage: formatDirection(undefined, target),
              textLength: query.length,
              providers,
            },
            () => setFailedKey(undefined),
          );
        }
        return undefined;
      },
    );
    return () => controller.abort();
  }, [isLoading, key, query, tone, target, providers, retrying]);

  return {
    result,
    isLoading,
    failed: failedKey === key && query.trim() !== "",
    retry: () => setFailedKey(undefined),
    visibleText: visibleTranslation(
      displayed?.text,
      streamed.key === key ? streamed.text : "",
      isLoading,
    ),
    retryWithNextProvider: () => {
      if (result) {
        setFailedKey(undefined);
        setRetry({ key, providers: providersAfter(providers, result.provider.id) });
      }
    },
  };
}
