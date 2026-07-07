import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

// Keep in sync with the `preferences[].data` array in package.json
const LANGUAGES = [
  { code: "am", name: "Amharic", native: "አማርኛ" },
  { code: "ar", name: "Arabic", native: "العربية" },
  { code: "be", name: "Belarusian", native: "Беларуская" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "bg", name: "Bulgarian", native: "Български" },
  { code: "el", name: "Greek", native: "Ελληνικά" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
  { code: "he", name: "Hebrew", native: "עברית" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "ne", name: "Nepali", native: "नेपाली" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "fa", name: "Persian", native: "فارسی" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ru", name: "Russian", native: "Русский" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्" },
  { code: "sr", name: "Serbian", native: "Српски" },
  { code: "si", name: "Sinhalese", native: "සිංහල" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ti", name: "Tigrinya", native: "ትግርኛ" },
  { code: "uk", name: "Ukrainian", native: "Українська" },
  { code: "ur", name: "Urdu", native: "اردو" },
];

async function fetchSuggestions(text: string, langCode: string): Promise<string[]> {
  const params = new URLSearchParams({
    text,
    itc: `${langCode}-t-i0-und`,
    num: "8",
    cp: "0",
    cs: "1",
    ie: "utf-8",
    oe: "utf-8",
    app: "demopage",
  });

  const res = await fetch(`https://inputtools.google.com/request?${params}`);

  if (!res.ok) {
    throw new Error(`Google API returned ${res.status}: ${res.statusText}`);
  }

  const data = (await res.json()) as [string, Array<[string, string[]]>];

  if (data[0] !== "SUCCESS") {
    throw new Error(`Transliteration failed with status: ${data[0]}`);
  }

  if (data[1]?.[0]?.[1]?.length) {
    return data[1][0][1];
  }

  return [text];
}

export default function PhoneticTyping() {
  const { language: defaultLang } = getPreferenceValues<Preferences.PhoneticTyping>();
  const [searchText, setSearchText] = useState("");
  const [lang, setLang] = useState(defaultLang);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [composedWords, setComposedWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cache = useRef(new Map<string, string[]>());

  useEffect(() => {
    cache.current.clear();
  }, [lang]);

  const commitWord = useCallback((word: string) => {
    setComposedWords((prev) => [...prev, word]);
    setSuggestions([]);
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      if (text.endsWith(" ") && text.trim().length > 0) {
        const word = text.trim();
        const key = `${lang}:${word}`;
        const cached = cache.current.get(key);
        if (cached && cached.length > 0) {
          commitWord(cached[0]);
          setSearchText("");
          return;
        }
      }
      setSearchText(text);
    },
    [commitWord, lang],
  );

  const undoLastWord = useCallback(() => {
    setComposedWords((prev) => prev.slice(0, -1));
  }, []);

  const clearAll = useCallback(() => {
    setComposedWords([]);
    setSuggestions([]);
    setSearchText("");
  }, []);

  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const key = `${lang}:${trimmed}`;
        let fetched = cache.current.get(key);
        if (!fetched) {
          if (controller.signal.aborted) return;
          fetched = await fetchSuggestions(trimmed, lang);
          cache.current.set(key, fetched);
        }
        if (!controller.signal.aborted) {
          // If user pressed Space while fetch was in-flight, auto-commit now
          if (searchText.endsWith(" ") && fetched.length > 0) {
            commitWord(fetched[0]);
            setSearchText("");
            return;
          }
          setSuggestions(fetched);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          await showToast({ style: Toast.Style.Failure, title: "Transliteration Failed", message: String(err) });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, lang, commitWord]);

  const composedText = composedWords.join(" ");
  const langMeta = LANGUAGES.find((l) => l.code === lang);
  const isTyping = searchText.trim().length > 0;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={handleSearchChange}
      searchBarPlaceholder={
        composedText
          ? composedText.length > 40
            ? `…${composedText.slice(-40)} · next word`
            : `${composedText} · next word`
          : `Type in English → ${langMeta?.native ?? lang}`
      }
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Language"
          value={lang}
          onChange={(v) => setLang(v as Preferences.PhoneticTyping["language"])}
        >
          {LANGUAGES.map(({ code, name, native }) => (
            <List.Dropdown.Item key={code} title={`${name} — ${native}`} value={code} />
          ))}
        </List.Dropdown>
      }
    >
      {isTyping && suggestions.length > 0 && (
        <List.Section title="Suggestions" subtitle={composedText ? `Composed: ${composedText}` : "Space = commit top"}>
          {suggestions.map((word, i) => {
            const fullText = composedText ? `${composedText} ${word}` : word;
            return (
              <List.Item
                key={`${i}-${word}`}
                icon={i === 0 ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Text}
                title={word}
                accessories={[{ tag: `${i + 1}` }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Word">
                      <Action
                        title="Commit Word"
                        icon={Icon.PlusCircle}
                        onAction={() => {
                          commitWord(word);
                          setSearchText("");
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Sentence">
                      <Action.Paste title="Paste Sentence" content={fullText} />
                      <Action.CopyToClipboard
                        title="Copy Sentence"
                        content={fullText}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                    {composedWords.length > 0 && (
                      <ActionPanel.Section>
                        <Action
                          title="Undo Last Word"
                          icon={Icon.ArrowCounterClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "z" }}
                          onAction={undoLastWord}
                        />
                        <Action
                          title="Start over"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                          onAction={clearAll}
                        />
                      </ActionPanel.Section>
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {!isTyping && composedText && (
        <List.Section title="Composed Text">
          <List.Item
            icon={{ source: Icon.Document, tintColor: Color.Blue }}
            title={composedText}
            subtitle={`${composedWords.length} word${composedWords.length !== 1 ? "s" : ""}`}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Use">
                  <Action.Paste content={composedText} />
                  <Action.CopyToClipboard content={composedText} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
                </ActionPanel.Section>
                <ActionPanel.Section title="Edit">
                  <Action
                    title="Undo Last Word"
                    icon={Icon.ArrowCounterClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "z" }}
                    onAction={undoLastWord}
                  />
                  <Action
                    title="Start over"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={clearAll}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!isTyping && !composedText && (
        <List.EmptyView
          icon={Icon.Keyboard}
          title="Phonetic Typing"
          description={`Type in English → ${langMeta?.name ?? ""}\n\nSpace commits the top suggestion automatically.\nPress ↵ to pick a specific suggestion.\nWhen done, press ↵ to paste into your app.`}
        />
      )}
    </List>
  );
}
