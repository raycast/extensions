import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { CharacterMatch, formatSyllable, lookup, parseQuery, QueryToken } from "./utils/pinyin-index";
import { speak } from "./utils/speak";
import { TranslationRequest, TranslationState, useTranslation } from "./utils/translate";
import {
  characterReadings,
  ChineseText,
  composeSuggestions,
  containsHan,
  describeChinese,
  englishShare,
  lookupEnglish,
  matchMeanings,
  Segment,
  Suggestion,
} from "./utils/word-index";

// Input counts as English when at least this share of its words appear in the dictionary's English.
const ENGLISH_SHARE = 0.6;
// Input that also reads as pinyin ("you", "man") shows only a few English matches, so the
// characters for the pinyin stay in view.
const ENGLISH_LIMIT_WITH_PINYIN = 3;
const ENGLISH_LIMIT = 10;
const RELATED_LIMIT = 8;
// English this many words long is translated even when the dictionary has it, since a
// sentence means more than its words.
const SENTENCE_WORDS = 3;
const MAX_WORD_ROWS = 200;

type Analysis =
  | { kind: "empty" }
  | { kind: "chinese"; text: ChineseText; readings: Segment[]; translation?: TranslationRequest }
  | {
      kind: "latin";
      english: Segment[];
      related: Segment[];
      suggestions: Suggestion[];
      sections: { token: QueryToken; matches: CharacterMatch[] }[];
      translation?: TranslationRequest;
    };

// Works out what the input is: Chinese text, English, pinyin, or English that also reads as
// pinyin ("you"), in which case both are shown.
function analyze(query: string): Analysis {
  if (!query) return { kind: "empty" };

  if (containsHan(query)) {
    const isSingleCharacter = [...query].length === 1;
    return {
      kind: "chinese",
      text: describeChinese(query),
      readings: isSingleCharacter ? characterReadings(query) : [],
      translation: isSingleCharacter ? undefined : { text: query, from: "zh-CN", to: "en" },
    };
  }

  const tokens = parseQuery(query);
  const isPinyin = tokens.length > 0 && tokens.every((token) => !token.isPrefix);
  // Tone numbers and marks only appear in pinyin.
  const canBeEnglish = !/[0-9]|\p{Mark}/u.test(query.normalize("NFD"));
  const isEnglish = canBeEnglish && englishShare(query) >= ENGLISH_SHARE;
  const wordCount = query.split(/\s+/).length;

  const { exact: english, related } = canBeEnglish
    ? lookupEnglish(
        query,
        isPinyin ? ENGLISH_LIMIT_WITH_PINYIN : ENGLISH_LIMIT,
        isEnglish && !isPinyin ? RELATED_LIMIT : 0,
      )
    : { exact: [], related: [] };
  const shouldTranslate = isEnglish && (wordCount >= SENTENCE_WORDS || (!isPinyin && english.length === 0));
  const showPinyin = isPinyin || !isEnglish;

  return {
    kind: "latin",
    english,
    related,
    suggestions: showPinyin ? composeSuggestions(tokens) : [],
    sections: showPinyin ? tokens.map((token) => ({ token, matches: lookup(token) })) : [],
    translation: shouldTranslate ? { text: query, from: "en", to: "zh-CN" } : undefined,
  };
}

export default function ChineseLookup() {
  const [searchText, setSearchText] = useState("");
  const query = searchText.trim();
  const analysis = useMemo(() => analyze(query), [query]);
  const translation = useTranslation(analysis.kind === "empty" ? undefined : analysis.translation);

  // Google's translation of the selected phrase for typed pinyin (the top one until another is
  // selected), shown next to the word-by-word meanings.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const suggestions = analysis.kind === "latin" ? analysis.suggestions : [];
  const phrase = suggestions.find((suggestion) => suggestionId(suggestion) === selectedId) ?? suggestions[0];
  const phraseTranslation = useTranslation(phrase && { text: phrase.text, from: "zh-CN", to: "en" });

  return (
    <List
      filtering={false}
      isLoading={translation.isLoading || phraseTranslation.isLoading}
      onSearchTextChange={setSearchText}
      onSelectionChange={setSelectedId}
      searchBarPlaceholder="Pinyin (nihao), English (hello) or Chinese (你好)"
    >
      {query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Nothing Found"
          description={`Nothing matches “${query}”. In pinyin, type v for ü, e.g. lv4.`}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Keyboard}
          title="Look Up Anything in Chinese"
          description="Type pinyin (nihao, ma3) for characters, English (hello, I want to eat noodles) for Chinese, or paste Chinese (你好) for its pinyin and meaning."
        />
      )}
      {analysis.kind === "chinese" && <ChineseResults analysis={analysis} translation={translation} />}
      {analysis.kind === "latin" && (
        <LatinResults analysis={analysis} translation={translation} phraseEnglish={phraseTranslation.result} />
      )}
    </List>
  );
}

function ChineseResults({
  analysis: { text, readings, translation: request },
  translation,
}: {
  analysis: Extract<Analysis, { kind: "chinese" }>;
  translation: TranslationState;
}) {
  if (readings.length > 0) {
    return (
      <List.Section title="Readings" subtitle={`${readings.length}`}>
        {readings.map((reading) => (
          <WordItem key={reading.pinyin} word={reading} />
        ))}
      </List.Section>
    );
  }
  return (
    <>
      <List.Section title="Translation">
        {request && <EnglishItem translation={translation} chinese={text} />}
        <TextItem label="Pinyin" value={text.pinyin} chinese={text} />
        {text.traditional !== text.text && <TextItem label="Traditional" value={text.traditional} chinese={text} />}
        {text.simplified !== text.text && <TextItem label="Simplified" value={text.simplified} chinese={text} />}
      </List.Section>
      <WordsSection words={text.words} />
    </>
  );
}

const suggestionId = (suggestion: Suggestion) => `phrase:${suggestion.text}`;

function LatinResults({
  analysis: { english, related, suggestions, sections, translation: request },
  translation,
  phraseEnglish,
}: {
  analysis: Extract<Analysis, { kind: "latin" }>;
  translation: TranslationState;
  phraseEnglish?: string;
}) {
  const translated = useMemo(
    () => (translation.result ? describeChinese(translation.result) : undefined),
    [translation.result],
  );
  const showSectionTitles = english.length > 0 || suggestions.length > 0 || sections.length > 1;

  return (
    <>
      {english.length > 0 && (
        <List.Section title="Dictionary">
          {english.map((word) => (
            <WordItem key={`${word.text}|${word.pinyin}`} word={word} />
          ))}
        </List.Section>
      )}
      {request && <TranslationSections translation={translation} text={translated} />}
      {related.length > 0 && (
        <List.Section title="Related">
          {related.map((word) => (
            <WordItem key={`${word.text}|${word.pinyin}`} word={word} />
          ))}
        </List.Section>
      )}
      {suggestions.length > 0 && (
        <List.Section title="Words & Phrases" subtitle={phraseEnglish && `“${phraseEnglish}”`}>
          {suggestions.map((suggestion) => (
            <WordItem
              key={suggestion.text}
              id={suggestionId(suggestion)}
              word={suggestion}
              tooltip={segmentMeanings(suggestion)}
            />
          ))}
        </List.Section>
      )}
      {sections.map(({ token, matches }, sectionIndex) => (
        <List.Section
          key={`${sectionIndex}-${token.syllable}`}
          title={showSectionTitles ? formatToken(token) : undefined}
          subtitle={showSectionTitles ? `${matches.length}` : undefined}
        >
          {matches.map((match) => (
            <CharacterItem key={match.entry.char} match={match} />
          ))}
        </List.Section>
      ))}
    </>
  );
}

// English translated into Chinese, with the Chinese broken down into words.
function TranslationSections({ translation, text }: { translation: TranslationState; text?: ChineseText }) {
  if (!text) {
    return (
      <List.Section title="Translation">
        {translation.error ? (
          <List.Item icon={Icon.Warning} title="Couldn't Translate" subtitle={translation.error} />
        ) : (
          <List.Item icon={Icon.Globe} title="Translating…" />
        )}
      </List.Section>
    );
  }
  return (
    <>
      <List.Section title="Translation">
        <TextItem label="Chinese" value={text.text} chinese={text} />
        <TextItem label="Pinyin" value={text.pinyin} chinese={text} />
        {text.traditional !== text.text && <TextItem label="Traditional" value={text.traditional} chinese={text} />}
      </List.Section>
      <WordsSection words={text.words} />
    </>
  );
}

function WordsSection({ words }: { words: Segment[] }) {
  if (words.length === 0) return null;
  return (
    <List.Section title="Words" subtitle={`${words.length}`}>
      {words.slice(0, MAX_WORD_ROWS).map((word) => (
        <WordItem key={`${word.text}|${word.pinyin}`} word={word} />
      ))}
    </List.Section>
  );
}

function formatToken(token: QueryToken) {
  const syllable = formatSyllable(token.syllable, token.tone);
  return token.isPrefix ? `${syllable}…` : syllable;
}

function segmentMeanings({ segments, definition }: Suggestion) {
  if (segments.length === 1) return definition;
  return segments.map((segment) => `${segment.text} ${segment.pinyin}: ${segment.definition}`).join("\n");
}

const SPEAK_ICON = { value: Icon.SpeakerOn, tooltip: "Double-click or press ↵ to hear it, again to hear it slower" };

// A whole piece of text in one form (pinyin, traditional, ...). Speaking always reads the Chinese.
function TextItem({ label, value, chinese }: { label: string; value: string; chinese: ChineseText }) {
  return (
    <List.Item
      icon={SPEAK_ICON}
      title={{ value, tooltip: value }}
      accessories={[{ text: label }]}
      actions={<ItemActions copy={value} speakText={chinese.text} pinyin={chinese.pinyin} />}
    />
  );
}

function EnglishItem({ translation, chinese }: { translation: TranslationState; chinese: ChineseText }) {
  const { result, error } = translation;
  return (
    <List.Item
      icon={error ? Icon.Warning : Icon.Globe}
      title={{ value: result ?? (error ? "Couldn't Translate" : "Translating…"), tooltip: result ?? error }}
      accessories={[{ text: "English" }]}
      actions={result ? <ItemActions copy={result} speakText={chinese.text} pinyin={chinese.pinyin} /> : undefined}
    />
  );
}

function WordItem({ id, word, tooltip }: { id?: string; word: Segment; tooltip?: string }) {
  const traditional = word.traditional && word.traditional !== word.text ? word.traditional.split(" / ") : [];
  return (
    <List.Item
      id={id}
      icon={SPEAK_ICON}
      title={word.text}
      subtitle={{ value: word.definition, tooltip: tooltip ?? word.definition }}
      accessories={[
        ...(traditional.length > 0 ? [{ text: traditional.join(" / "), tooltip: "Traditional" }] : []),
        { tag: word.pinyin },
      ]}
      actions={<ItemActions copy={word.text} speakText={word.text} pinyin={word.pinyin} traditional={traditional} />}
    />
  );
}

function CharacterItem({ match }: { match: CharacterMatch }) {
  const { entry } = match;
  const pinyin = match.readings.map((reading) => reading.pinyin).join(", ");
  const traditional = entry.traditional.join(" / ");
  const meanings = matchMeanings(match);
  const tooltip =
    meanings.length > 1
      ? meanings.map((meaning) => `${meaning.pinyin}: ${meaning.definition}`).join("\n")
      : meanings[0].definition;

  return (
    <List.Item
      icon={SPEAK_ICON}
      title={entry.char}
      subtitle={{ value: meanings[0].definition, tooltip }}
      accessories={[
        ...(traditional ? [{ text: traditional, tooltip: "Traditional" }] : []),
        { tag: pinyin, tooltip: `All readings: ${entry.readings.map((reading) => reading.pinyin).join(", ")}` },
      ]}
      actions={<ItemActions copy={entry.char} speakText={entry.char} pinyin={pinyin} traditional={entry.traditional} />}
    />
  );
}

function ItemActions({
  copy,
  speakText,
  pinyin,
  traditional = [],
}: {
  copy: string;
  speakText: string;
  pinyin?: string;
  traditional?: string[];
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {/* Speak comes first so double-clicking a row or pressing ↵ reads it aloud. */}
        <Action title="Speak" icon={Icon.SpeakerOn} onAction={() => speak(speakText)} />
        <Action.CopyToClipboard content={copy} />
        <Action.Paste content={copy} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {speakText !== copy && <Action.CopyToClipboard title="Copy Chinese" content={speakText} />}
        {traditional.map((form, index) => (
          <Action.CopyToClipboard
            key={form}
            title={`Copy Traditional ${form}`}
            content={form}
            shortcut={index === 0 ? { modifiers: ["cmd"], key: "t" } : undefined}
          />
        ))}
        {pinyin && pinyin !== copy && (
          <Action.CopyToClipboard
            title="Copy Pinyin"
            content={pinyin}
            shortcut={{ modifiers: ["cmd", "opt"], key: "p" }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
