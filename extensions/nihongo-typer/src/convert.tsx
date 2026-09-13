import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  LocalStorage,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import * as wanakana from "wanakana";
import { kanjiDictionary, posTag, readingsForKanji } from "./dictionary";
import { searchEnglish } from "./english";
import {
  JAPANESE_SCRIPT,
  KANJI_SCRIPT,
  isStrandedRomaji,
  toHiraganaFinal,
  toKatakanaFinal,
} from "./romaji";

const HISTORY_KEY = "history";
const FAVORITES_KEY = "favorites";
const HISTORY_LIMIT = 10;

interface HistoryEntry {
  input: string;
  hiragana: string;
  katakana: string;
  kanji?: string;
  gloss?: string;
}

const execFileAsync = promisify(execFile);

// macOS ships Japanese voices (Kyoko/Otoya) that `say` can use offline, keeping
// the extension's no-network guarantee intact. They are optional downloads
// though, so a missing voice falls back to the system default rather than
// failing outright.
async function pronounce(text: string, voice: string) {
  try {
    await execFileAsync("say", voice ? ["-v", voice, text] : [text]);
  } catch {
    try {
      await execFileAsync("say", [text]);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not play pronunciation",
        message: `Install the ${voice || "Japanese"} voice in System Settings → Accessibility → Spoken Content`,
      });
    }
  }
}

function furiganaFormats(kanji: string, reading: string) {
  return [
    { title: "Furigana Text", content: `${kanji}(${reading})` },
    { title: "Anki / Markdown", content: `${kanji}[${reading}]` },
    { title: "HTML Ruby", content: `<ruby>${kanji}<rt>${reading}</rt></ruby>` },
  ];
}

function detailMarkdown(headline: string, reading?: string) {
  return reading && reading !== headline
    ? `# ${headline}\n\n## ${reading}`
    : `# ${headline}`;
}

async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  return LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

async function loadFavorites(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(FAVORITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveFavorites(entries: HistoryEntry[]) {
  return LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(entries));
}

// A saved word is identified by what the user would recognise it as — its Kanji
// when it has one, its reading otherwise — so the same word saved from the Kanji
// section and from a reverse lookup doesn't end up stored twice.
function favoriteKey(entry: HistoryEntry) {
  return entry.kanji ?? entry.hiragana;
}

export default function Command() {
  const { primaryAction, keepHistory, voice } =
    getPreferenceValues<Preferences.Convert>();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [favorites, setFavorites] = useState<HistoryEntry[]>([]);
  const [showingDetail, setShowingDetail] = useState(false);

  useEffect(() => {
    if (keepHistory) loadHistory().then(setHistory);
    loadFavorites().then(setFavorites);
  }, [keepHistory]);

  const trimmed = input.trim();
  const reverseMode = trimmed.length > 0 && JAPANESE_SCRIPT.test(trimmed);
  const containsKanji = KANJI_SCRIPT.test(trimmed);
  // A pasted word can mix kanji and okurigana (e.g. 食べる) — wanakana can only
  // romanize the kana part, so a reading lookup is needed whenever any kanji
  // is present, not just for kanji-only input.
  const kanjiOnlyMode = reverseMode && containsKanji;
  const pureKanaMode = reverseMode && !containsKanji;

  // Conversion runs on the trimmed input: a trailing space would otherwise be
  // carried into the copied kana and, worse, into the dictionary lookup key,
  // where the exact match ("ねこ " vs "ねこ") drops every Kanji suggestion.
  const hiragana = useMemo(() => toHiraganaFinal(trimmed), [trimmed]);
  const katakana = useMemo(() => toKatakanaFinal(trimmed), [trimmed]);
  const romaji = useMemo(
    () => (pureKanaMode ? wanakana.toRomaji(trimmed) : ""),
    [pureKanaMode, trimmed],
  );
  const readingForLookup = pureKanaMode
    ? wanakana.toHiragana(trimmed)
    : hiragana;
  const kanjiCandidates = useMemo(
    () => (kanjiOnlyMode ? [] : (kanjiDictionary.get(readingForLookup) ?? [])),
    [kanjiOnlyMode, readingForLookup],
  );
  const kanjiReadings = useMemo(
    () => (kanjiOnlyMode ? readingsForKanji(trimmed) : []),
    [kanjiOnlyMode, trimmed],
  );
  const englishResults = useMemo(
    () => (reverseMode ? [] : searchEnglish(trimmed)),
    [reverseMode, trimmed],
  );
  // An English query is not Romaji, so its "conversion" is noise ("green tea" ->
  // "gれえん てあ"). Suppress the kana rows in that case and let the English
  // results stand on their own.
  const showKanaRows = !isStrandedRomaji(hiragana);

  function recordHistory(entry: HistoryEntry) {
    if (!keepHistory) return;
    setHistory((current) => {
      const deduped = current.filter(
        (item) => item.input.toLowerCase() !== entry.input.toLowerCase(),
      );
      const next = [entry, ...deduped].slice(0, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  }

  function removeHistoryEntry(entryInput: string) {
    setHistory((current) => {
      const next = current.filter((item) => item.input !== entryInput);
      saveHistory(next);
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function isFavorite(entry: HistoryEntry) {
    return favorites.some((item) => favoriteKey(item) === favoriteKey(entry));
  }

  function toggleFavorite(entry: HistoryEntry) {
    const key = favoriteKey(entry);
    const existing = favorites.some((item) => favoriteKey(item) === key);
    const next = existing
      ? favorites.filter((item) => favoriteKey(item) !== key)
      : [entry, ...favorites];
    setFavorites(next);
    saveFavorites(next);
    showToast({
      style: Toast.Style.Success,
      title: existing ? "Removed from Saved Words" : "Saved word",
    });
  }

  // Accessories and the detail pane are mutually exclusive in practice: Raycast
  // gives the list column very little room once the detail pane is open, so the
  // tag and star are dropped there and the same facts appear in the pane.
  function accessoriesFor(pos: string | undefined, entry: HistoryEntry) {
    if (showingDetail) return undefined;
    const accessories: List.Item.Accessory[] = [];
    if (isFavorite(entry)) accessories.push({ icon: Icon.Star });
    const tag = posTag(pos);
    if (tag) accessories.push({ tag });
    return accessories.length > 0 ? accessories : undefined;
  }

  function renderDetail(
    headline: string,
    reading?: string,
    meta?: { gloss?: string; pos?: string },
  ) {
    if (!showingDetail) return undefined;
    const romajiOf = reading ?? headline;
    return (
      <List.Item.Detail
        markdown={detailMarkdown(headline, reading)}
        metadata={
          <List.Item.Detail.Metadata>
            {reading && (
              <List.Item.Detail.Metadata.Label title="Reading" text={reading} />
            )}
            {wanakana.isJapanese(romajiOf) && (
              <List.Item.Detail.Metadata.Label
                title="Romaji"
                text={wanakana.toRomaji(romajiOf)}
              />
            )}
            {posTag(meta?.pos) && (
              <List.Item.Detail.Metadata.Label
                title="Part of Speech"
                text={posTag(meta?.pos)}
              />
            )}
            {meta?.gloss && (
              <List.Item.Detail.Metadata.Label
                title="Meaning"
                text={meta.gloss}
              />
            )}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  // Every ActionPanel gets the same trailing section, so the shortcuts stay put
  // no matter which kind of result is selected. `speak` is the Japanese text to
  // pronounce, which is not always what the row copies (a Romaji row still has
  // to be spoken as kana).
  function renderExtras(options: {
    entry: HistoryEntry;
    speak?: string;
    kanji?: string;
    reading?: string;
  }) {
    const { entry, speak, kanji, reading } = options;
    const saved = isFavorite(entry);
    return (
      <ActionPanel.Section>
        {speak && (
          <Action
            title="Pronounce Word"
            icon={Icon.Speaker}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() => pronounce(speak, voice)}
          />
        )}
        {kanji &&
          reading &&
          furiganaFormats(kanji, reading).map((format) => (
            <Action.CopyToClipboard
              key={format.title}
              title={`Copy ${format.title}`}
              icon={Icon.Text}
              content={format.content}
            />
          ))}
        <Action
          title={saved ? "Remove from Saved Words" : "Save to Saved Words"}
          icon={saved ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() => toggleFavorite(entry)}
        />
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={() => setShowingDetail((current) => !current)}
        />
      </ActionPanel.Section>
    );
  }

  function buildActions(kana: string, label: string, onUsed: () => void) {
    const actionsByKind = {
      copyAndClose: (
        <Action
          key="copyAndClose"
          title={`Copy ${label} and Close`}
          icon={Icon.Clipboard}
          onAction={async () => {
            await Clipboard.copy(kana);
            onUsed();
            await showHUD(`Copied "${kana}"`);
          }}
        />
      ),
      copyOnly: (
        <Action.CopyToClipboard
          key="copyOnly"
          title={`Copy ${label}`}
          content={kana}
          onCopy={onUsed}
        />
      ),
      paste: (
        <Action.Paste
          key="paste"
          title={`Paste ${label} to Active App`}
          content={kana}
          onPaste={onUsed}
        />
      ),
    };

    const order: (keyof typeof actionsByKind)[] = [
      "copyAndClose",
      "copyOnly",
      "paste",
    ];
    // Fall back rather than trusting the preference blindly: a missing or stale
    // stored value would otherwise put `undefined` at the head of the panel.
    const active = order.includes(primaryAction) ? primaryAction : order[0];
    const sorted = [active, ...order.filter((kind) => kind !== active)];
    return sorted.map((kind) => actionsByKind[kind]);
  }

  const currentEntry: HistoryEntry = pureKanaMode
    ? {
        input: trimmed,
        hiragana: readingForLookup,
        katakana: wanakana.toKatakana(readingForLookup),
      }
    : { input: trimmed, hiragana, katakana };

  function renderKanjiSection() {
    if (kanjiCandidates.length === 0) return null;
    return (
      <List.Section title="Kanji">
        {kanjiCandidates.map((candidate) => {
          const entry: HistoryEntry = {
            ...currentEntry,
            kanji: candidate.kanji,
            gloss: candidate.gloss,
          };
          return (
            <List.Item
              key={candidate.kanji}
              title={candidate.kanji}
              subtitle={showingDetail ? undefined : candidate.gloss}
              icon={Icon.Book}
              accessories={accessoriesFor(candidate.pos, entry)}
              detail={renderDetail(candidate.kanji, readingForLookup, {
                gloss: candidate.gloss,
                pos: candidate.pos,
              })}
              actions={
                <ActionPanel>
                  {buildActions(candidate.kanji, "Kanji", () =>
                    recordHistory(entry),
                  )}
                  {renderExtras({
                    entry,
                    speak: candidate.kanji,
                    kanji: candidate.kanji,
                    reading: readingForLookup,
                  })}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    );
  }

  function renderEnglishSection() {
    if (englishResults.length === 0) return null;
    return (
      <List.Section title="English → Japanese">
        {englishResults.map((result, index) => {
          // The index stores each reading in its native script (loanwords stay
          // Katakana), so label the action after what the reading actually is.
          const readingLabel = wanakana.isKatakana(result.reading)
            ? "Katakana"
            : "Hiragana";
          const entry: HistoryEntry = {
            input: trimmed,
            hiragana: wanakana.toHiragana(result.reading),
            katakana: wanakana.toKatakana(result.reading),
            kanji: result.kanji,
            gloss: result.gloss,
          };
          return (
            <List.Item
              key={`${result.reading}-${result.kanji ?? index}`}
              title={result.kanji ?? result.reading}
              subtitle={
                showingDetail
                  ? undefined
                  : result.kanji
                    ? `${result.reading} — ${result.gloss}`
                    : result.gloss
              }
              icon={Icon.MagnifyingGlass}
              accessories={accessoriesFor(result.pos, entry)}
              detail={renderDetail(
                result.kanji ?? result.reading,
                result.kanji ? result.reading : undefined,
                { gloss: result.gloss, pos: result.pos },
              )}
              actions={
                <ActionPanel>
                  {result.kanji &&
                    buildActions(result.kanji, "Kanji", () =>
                      recordHistory(entry),
                    )}
                  {buildActions(result.reading, readingLabel, () =>
                    recordHistory(entry),
                  )}
                  {renderExtras({
                    entry,
                    speak: result.kanji ?? result.reading,
                    kanji: result.kanji,
                    reading: result.reading,
                  })}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    );
  }

  const showHistory = keepHistory && trimmed.length === 0 && history.length > 0;
  const showFavorites = trimmed.length === 0 && favorites.length > 0;

  function renderSavedSection() {
    if (!showFavorites) return null;
    return (
      <List.Section title="Saved Words">
        {favorites.map((entry) => (
          <List.Item
            key={`saved-${favoriteKey(entry)}`}
            title={entry.kanji ?? entry.hiragana}
            subtitle={
              showingDetail
                ? undefined
                : (entry.gloss ?? `${entry.hiragana} / ${entry.katakana}`)
            }
            icon={Icon.Star}
            detail={renderDetail(
              entry.kanji ?? entry.hiragana,
              entry.kanji ? entry.hiragana : undefined,
              { gloss: entry.gloss },
            )}
            actions={
              <ActionPanel>
                {entry.kanji &&
                  buildActions(entry.kanji, "Kanji", () =>
                    recordHistory(entry),
                  )}
                {buildActions(entry.hiragana, "Hiragana", () =>
                  recordHistory(entry),
                )}
                {buildActions(entry.katakana, "Katakana", () =>
                  recordHistory(entry),
                )}
                {renderExtras({
                  entry,
                  speak: entry.kanji ?? entry.hiragana,
                  kanji: entry.kanji,
                  reading: entry.hiragana,
                })}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  return (
    <List
      searchBarPlaceholder="Type Romaji or English, e.g. matcha / bridge — or paste Kana/Kanji"
      searchText={input}
      onSearchTextChange={setInput}
      filtering={false}
      isShowingDetail={showingDetail}
    >
      {trimmed.length === 0 ? (
        showHistory || showFavorites ? (
          <>
            {renderSavedSection()}
            {showHistory && (
              <List.Section title="Recent">
                {history.map((entry) => (
                  <List.Item
                    key={entry.input}
                    title={entry.kanji ?? entry.hiragana}
                    subtitle={
                      entry.kanji
                        ? `${entry.input} · ${entry.hiragana} / ${entry.katakana}`
                        : `${entry.input} · Katakana ${entry.katakana}`
                    }
                    icon={entry.kanji ? Icon.Book : Icon.Clock}
                    actions={
                      <ActionPanel>
                        {entry.kanji &&
                          buildActions(entry.kanji, "Kanji", () =>
                            recordHistory(entry),
                          )}
                        {buildActions(entry.hiragana, "Hiragana", () =>
                          recordHistory(entry),
                        )}
                        {buildActions(entry.katakana, "Katakana", () =>
                          recordHistory(entry),
                        )}
                        {renderExtras({
                          entry,
                          speak: entry.kanji ?? entry.hiragana,
                          kanji: entry.kanji,
                          reading: entry.hiragana,
                        })}
                        <Action
                          title="Remove from History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => removeHistoryEntry(entry.input)}
                        />
                        <Action
                          title="Clear History"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                          onAction={clearHistory}
                        />
                      </ActionPanel>
                    }
                  />
                ))}
              </List.Section>
            )}
          </>
        ) : (
          <List.EmptyView
            icon={Icon.Text}
            title="Type Romaji or English to search"
            description="Hiragana, Katakana, Kanji, and English lookup results will appear here"
          />
        )
      ) : kanjiOnlyMode ? (
        kanjiReadings.length > 0 ? (
          <List.Section title="Readings">
            {kanjiReadings.map((candidate) => {
              const candidateRomaji = wanakana.toRomaji(candidate.reading);
              const entry: HistoryEntry = {
                input: trimmed,
                hiragana: candidate.reading,
                katakana: wanakana.toKatakana(candidate.reading),
                kanji: trimmed,
                gloss: candidate.gloss,
              };
              return (
                <List.Item
                  key={candidate.reading}
                  title={candidateRomaji}
                  subtitle={
                    showingDetail
                      ? undefined
                      : `Romaji · reading: ${candidate.reading} — ${candidate.gloss}`
                  }
                  icon={Icon.Circle}
                  accessories={accessoriesFor(candidate.pos, entry)}
                  detail={renderDetail(trimmed, candidate.reading, {
                    gloss: candidate.gloss,
                    pos: candidate.pos,
                  })}
                  actions={
                    <ActionPanel>
                      {buildActions(candidateRomaji, "Romaji", () =>
                        recordHistory(entry),
                      )}
                      {/* Someone pasting Kanji usually wants its kana reading
                          at least as often as the Romaji, so offer both. */}
                      {buildActions(candidate.reading, "Hiragana", () =>
                        recordHistory(entry),
                      )}
                      {buildActions(entry.katakana, "Katakana", () =>
                        recordHistory(entry),
                      )}
                      {renderExtras({
                        entry,
                        speak: trimmed,
                        kanji: trimmed,
                        reading: candidate.reading,
                      })}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.QuestionMarkCircle}
            title="No known reading for this Kanji"
            description="This word isn't in the bundled dictionary, so Romaji can't be generated for it."
          />
        )
      ) : pureKanaMode ? (
        <>
          <List.Item
            title={romaji}
            subtitle="Romaji"
            icon={Icon.Circle}
            actions={
              <ActionPanel>
                {buildActions(romaji, "Romaji", () =>
                  recordHistory(currentEntry),
                )}
                {renderExtras({ entry: currentEntry, speak: trimmed })}
              </ActionPanel>
            }
          />
          {/* Kana-to-kana: show whichever script the input isn't already in,
              so pasted ねこ also offers ネコ (and コーヒー offers こうひい). */}
          {hiragana !== trimmed && (
            <List.Item
              title={hiragana}
              subtitle="Hiragana"
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  {buildActions(hiragana, "Hiragana", () =>
                    recordHistory(currentEntry),
                  )}
                  {renderExtras({ entry: currentEntry, speak: hiragana })}
                </ActionPanel>
              }
            />
          )}
          {katakana !== trimmed && (
            <List.Item
              title={katakana}
              subtitle="Katakana"
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  {buildActions(katakana, "Katakana", () =>
                    recordHistory(currentEntry),
                  )}
                  {renderExtras({ entry: currentEntry, speak: katakana })}
                </ActionPanel>
              }
            />
          )}
          {renderKanjiSection()}
        </>
      ) : !showKanaRows &&
        kanjiCandidates.length === 0 &&
        englishResults.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matches"
          description="Type Romaji for a kana conversion, or an English word to search the dictionary."
        />
      ) : (
        <>
          {showKanaRows && (
            <List.Item
              title={hiragana}
              subtitle="Hiragana"
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  {buildActions(hiragana, "Hiragana", () =>
                    recordHistory(currentEntry),
                  )}
                  {renderExtras({ entry: currentEntry, speak: hiragana })}
                </ActionPanel>
              }
            />
          )}
          {showKanaRows && (
            <List.Item
              title={katakana}
              subtitle="Katakana"
              icon={Icon.Circle}
              actions={
                <ActionPanel>
                  {buildActions(katakana, "Katakana", () =>
                    recordHistory(currentEntry),
                  )}
                  {renderExtras({ entry: currentEntry, speak: katakana })}
                </ActionPanel>
              }
            />
          )}
          {renderKanjiSection()}
          {renderEnglishSection()}
        </>
      )}
    </List>
  );
}
