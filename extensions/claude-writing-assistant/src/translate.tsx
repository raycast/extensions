import { Action, ActionPanel, getSelectedText, Icon, LaunchProps, List } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Chat } from "./components/Chat";
import { runClaude, Usage } from "./lib/claude";
import { describeError, showError } from "./lib/errors";
import { AUTO, LANGUAGES, languageCode, languageTitle, parseTargetSuffix } from "./lib/languages";
import { formatUsd, modelLabel } from "./lib/models";
import { dictionarySystem, selectionMessage, translatorSystem } from "./lib/prompts";
import { settings } from "./lib/settings";
import { speak } from "./lib/system";
import { formatDuration, guessLanguageCode, isShortPhrase, oneLine, stripWrapping, throttle } from "./lib/text";
import { recordUsage } from "./lib/usage";

interface Result {
  text: string;
  done: boolean;
  error?: string;
  usage?: Usage;
  durationMs?: number;
}

interface Request {
  source: string;
  target: string;
  key: string;
}

const DEBOUNCE_MS = 450;

/** Streams one Claude answer for `key`, caching finished results for the lifetime of the view. */
function useStreamed(key: string | null, system: () => string, source: string): Result | undefined {
  const [s] = useState(settings);
  const cache = useRef(new Map<string, Result>());
  const [result, setResult] = useState<Result>();

  useEffect(() => {
    if (!key) {
      setResult(undefined);
      return;
    }
    const hit = cache.current.get(key);
    if (hit) {
      setResult(hit);
      return;
    }
    const controller = new AbortController();
    const show = throttle((text: string) => setResult({ text, done: false }), 60);
    setResult({ text: "", done: false });
    runClaude({
      apiKey: s.apiKey,
      model: s.quickModel,
      effort: "low",
      system: system(),
      messages: [{ role: "user", content: selectionMessage(source) }],
      signal: controller.signal,
      onText: show,
    })
      .then((response) => {
        show.cancel();
        const done: Result = {
          text: stripWrapping(response.text, source),
          done: true,
          usage: response.usage,
          durationMs: response.durationMs,
        };
        cache.current.set(key, done);
        setResult(done);
        void recordUsage(response.usage);
      })
      .catch((error) => {
        show.cancel();
        if (controller.signal.aborted) return;
        setResult({ text: "", done: true, error: describeError(error).title });
        void showError(error);
      });
    return () => controller.abort();
  }, [key]);

  return result;
}

function footer(result: Result, targetTitle?: string): string {
  if (!result.done || !result.usage) return "";
  const parts = [
    targetTitle,
    modelLabel(result.usage.model),
    result.durationMs ? formatDuration(result.durationMs) : undefined,
    formatUsd(result.usage.cost),
  ];
  return `\n\n---\n\n_${parts.filter(Boolean).join(" · ")}_`;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Translate }>) {
  const [s] = useState(settings);
  const initial = (props.arguments.text || props.fallbackText || "").trim();
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [target, setTarget] = useState(AUTO);
  const [readingSelection, setReadingSelection] = useState(!initial);
  const typed = useRef(false);

  useEffect(() => {
    if (initial) return;
    getSelectedText()
      .then((selected) => {
        if (selected.trim() && !typed.current) {
          setText(selected.trim());
          setQuery(selected.trim());
        }
      })
      .catch(() => undefined)
      .finally(() => setReadingSelection(false));
  }, []);

  useEffect(() => {
    if (text === query) return;
    const timer = setTimeout(() => setQuery(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const suffix = parseTargetSuffix(query);
  const source = (suffix?.text ?? query).trim();
  const lang = suffix ? suffix.language.value : target;
  const request: Request | null = source ? { source, target: lang, key: `${lang}\u0000${source}` } : null;

  const translation = useStreamed(request?.key ?? null, () => translatorSystem(lang, s.langs), source);
  const showDictionary = !!request && isShortPhrase(source);
  const dictionary = useStreamed(
    showDictionary && translation?.done && !translation.error ? `dict\u0000${request.key}` : null,
    () => dictionarySystem(lang, s.langs),
    source,
  );

  const output = translation?.text ?? "";
  const outputCode = lang === AUTO ? guessLanguageCode(output) : languageCode(lang);
  const targetTitle = lang === AUTO ? (outputCode ? languageTitle(outputCode) : undefined) : languageTitle(lang);
  const busy = readingSelection || (!!translation && !translation.done) || (!!dictionary && !dictionary.done);

  function markdown(result: Result | undefined, emptyText: string): string {
    if (!result) return "";
    if (result.error) return `> ⚠️ ${result.error}`;
    if (!result.text) return `_${emptyText}_`;
    const body = !result.text.includes("\n") && result.text.length <= 90 ? `## ${result.text}` : result.text;
    return body + footer(result, result === translation ? targetTitle : undefined);
  }

  const alternatives = request && (
    <Action.Push
      title="Suggest Alternatives"
      icon={Icon.Stars}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      target={
        <Chat
          navigationTitle="Alternative Translations"
          seed={{
            prompt: "Suggest alternative translations",
            instruction: `Suggest 2–3 alternative translations of this text${targetTitle ? ` into ${targetTitle}` : ""} and briefly explain how they differ in nuance. Write the explanation in ${s.langs.primary}.`,
            attachments: [{ kind: "selection", text: source, source: "selection" }],
            send: true,
            model: s.quickModel,
          }}
        />
      }
    />
  );

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        {output && translation?.done && <Action.Paste title="Paste Translation" content={output} />}
        {output && translation?.done && <Action.CopyToClipboard title="Copy Translation" content={output} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {output && (
          <Action
            title="Read Aloud"
            icon={Icon.SpeakerOn}
            shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            onAction={() => void speak(output, outputCode)}
          />
        )}
        {source && (
          <Action
            title="Read Source Aloud"
            icon={Icon.SpeakerHigh}
            shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "s" }}
            onAction={() => void speak(source, guessLanguageCode(source))}
          />
        )}
        {output && translation?.done && (
          <Action
            title="Translate Back"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            onAction={() => {
              typed.current = true;
              setTarget(AUTO);
              setText(output);
              setQuery(output);
            }}
          />
        )}
        {alternatives}
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List
      isLoading={busy}
      isShowingDetail={!!request}
      filtering={false}
      searchText={text}
      onSearchTextChange={(value) => {
        typed.current = true;
        setText(value);
      }}
      searchBarPlaceholder="Text to translate… (end with >de to pick a language)"
      searchBarAccessory={
        <List.Dropdown tooltip="Target Language" storeValue onChange={setTarget}>
          <List.Dropdown.Item title="Automatic" value={AUTO} icon={Icon.Wand} />
          <List.Dropdown.Section title="Languages">
            {LANGUAGES.map((l) => (
              <List.Dropdown.Item key={l.value} title={l.value} value={l.value} keywords={[l.native, l.code]} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!request ? (
        <List.EmptyView
          icon={{ source: "commands/translate.png" }}
          title={readingSelection ? "Reading selection…" : "Type text to translate"}
          description={`${s.langs.primary} ⇄ ${s.langs.secondary} automatically. Pick another language at the top right, or end your text with “>de”.`}
        />
      ) : (
        <>
          <List.Item
            id="translation"
            icon={translation?.error ? Icon.Warning : Icon.Globe}
            title={output ? oneLine(output, 60) : "Translating…"}
            accessories={targetTitle ? [{ tag: targetTitle }] : undefined}
            detail={<List.Item.Detail markdown={markdown(translation, "Translating…")} />}
            actions={actions}
          />
          {showDictionary && (
            <List.Item
              id="dictionary"
              icon={Icon.Book}
              title="Dictionary"
              subtitle={oneLine(source, 40)}
              detail={
                <List.Item.Detail
                  markdown={
                    dictionary
                      ? markdown(dictionary, "Preparing dictionary entry…")
                      : "_The dictionary entry follows the translation…_"
                  }
                />
              }
              actions={
                <ActionPanel>
                  {dictionary?.text && (
                    <Action.CopyToClipboard title="Copy Dictionary Entry" content={dictionary.text} />
                  )}
                  {output && <Action.Paste title="Paste Translation" content={output} />}
                  {source && (
                    <Action
                      title="Read Source Aloud"
                      icon={Icon.SpeakerHigh}
                      shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "s" }}
                      onAction={() => void speak(source, guessLanguageCode(source))}
                    />
                  )}
                </ActionPanel>
              }
            />
          )}
        </>
      )}
    </List>
  );
}
