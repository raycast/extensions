import { ActionPanel, List, Action, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript } from "@raycast/utils";
import { ModuleSelector } from "./components/ModuleSelector";
import { BibleData, BibleBook } from "./components/BibleData";
import { fetchModules } from "./utils/moduleUtils";

interface Preferences {
  defaultText: string;
}

interface VerseResult {
  reference: string;
  text: string;
  module: string;
  book: string;
  chapter: number;
  verse: number;
}

interface Reference {
  book: string;
  chapter: number;
  verse: number;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [verses, setVerses] = useState<VerseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState(preferences.defaultText); // Will be updated when modules load
  const [currentStartRef, setCurrentStartRef] = useState<Reference | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Initialize with default module when component mounts
  useEffect(() => {
    const initializeModule = async () => {
      try {
        const { defaultModule } = await fetchModules(preferences.defaultText);
        setSelectedModule(defaultModule);
      } catch (error) {
        console.error("Failed to initialize default module:", error);
        // Keep preference default as fallback
      }
    };
    initializeModule();
  }, []);

  // Function to clean verse text by removing extra spaces
  const cleanVerseText = (text: string): string => {
    return text
      .trim() // Remove leading/trailing whitespace
      .replace(/\s+/g, " "); // Replace multiple consecutive spaces with single space
  };

  // Cache for verses
  const verseCache = new Map<string, VerseResult>();

  // Find BibleData entry for a book name, handling abbreviations
  const findBookData = (bookName: string): BibleBook | null => {
    const normalizedInput = bookName.toLowerCase().trim();

    // Try exact match first
    let match = BibleData.find((b) => b.name.toLowerCase() === normalizedInput);
    if (match) return match;

    // Try prefix matching (handles abbreviations like "1 cor" -> "1 Corinthians")
    match = BibleData.find((b) => b.name.toLowerCase().startsWith(normalizedInput));
    if (match) return match;

    // Try if input matches start of any word in book name (handles "1cor" -> "1 Corinthians")
    match = BibleData.find((b) => {
      const bookWords = b.name.toLowerCase().split(" ");
      return bookWords.some((word) => word.startsWith(normalizedInput));
    });
    if (match) return match;

    // Try contains matching as last resort
    match = BibleData.find((b) => b.name.toLowerCase().includes(normalizedInput));
    return match || null;
  };

  // Parse reference from string like "John 3:16", "John 3.16", "John 3", or just "John"
  const parseReference = (ref: string): Reference | null => {
    const trimmedRef = ref.trim();

    // Try to match with chapter and/or verse first
    const fullMatch = trimmedRef.match(/^(.+?)\s+(\d+)(?:[:.](\d+))?$/);
    if (fullMatch) {
      const [, book, chapter, verse] = fullMatch;
      return {
        book: book.trim(),
        chapter: parseInt(chapter),
        verse: verse ? parseInt(verse) : 1,
      };
    }

    // If no numbers found, treat the whole string as a book name and start at chapter 1, verse 1
    if (trimmedRef.length > 0) {
      return {
        book: trimmedRef,
        chapter: 1,
        verse: 1,
      };
    }

    return null;
  };

  // Generate next verse reference
  const getNextReference = (ref: Reference): Reference => {
    const bookData = findBookData(ref.book);
    if (!bookData) return ref;

    if (ref.verse < bookData.verses[ref.chapter - 1]) {
      return { ...ref, verse: ref.verse + 1 };
    } else if (ref.chapter < bookData.chapters) {
      return { book: ref.book, chapter: ref.chapter + 1, verse: 1 };
    } else {
      // Move to next book
      const currentBookIndex = BibleData.findIndex((b) => b.name === bookData.name);
      if (currentBookIndex < BibleData.length - 1) {
        const nextBook = BibleData[currentBookIndex + 1];
        return { book: nextBook.name, chapter: 1, verse: 1 };
      } else {
        // End of Bible
        return ref;
      }
    }
  };

  // Generate verse references starting from a reference
  const generateVerseReferences = (startRef: Reference, count: number): Reference[] => {
    const refs: Reference[] = [];
    let current = startRef;

    for (let i = 0; i < count; i++) {
      refs.push(current);
      current = getNextReference(current);
    }

    return refs;
  }; // Load verses progressively, updating state as each one loads
  const loadVersesProgressively = async (references: Reference[]) => {
    for (const ref of references) {
      const cacheKey = `${selectedModule}-${ref.book}-${ref.chapter}-${ref.verse}`;

      if (verseCache.has(cacheKey)) {
        const cachedVerse = verseCache.get(cacheKey)!;
        setVerses((prev) => [...prev, cachedVerse]);
        continue;
      }

      // Add delay between calls to avoid overwhelming Accordance
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const appleScript = `
          tell application "Accordance"
            if not running then launch
            try
              set theModule to "${selectedModule}"
              set verseText to «event AccdTxRf» {theModule, "${ref.book} ${ref.chapter}:${ref.verse}", true}
              return verseText
            on error errMsg
              return "Error: " & errMsg
            end try
          end tell
        `;

        const stdout = await runAppleScript(appleScript);

        if (stdout.trim().startsWith("Error:")) {
          console.error(`Error loading ${ref.book} ${ref.chapter}:${ref.verse}:`, stdout.trim());
          continue;
        }

        const result: VerseResult = {
          reference: `${ref.book} ${ref.chapter}:${ref.verse}`,
          text: cleanVerseText(stdout.trim()),
          module: selectedModule,
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
        };

        verseCache.set(cacheKey, result);
        setVerses((prev) => [...prev, result]);
      } catch {
        console.error(`Failed to load ${ref.book} ${ref.chapter}:${ref.verse}`);
      }
    }
  };

  // Handle search input
  const handleSearch = async (searchQuery: string) => {
    const startRef = parseReference(searchQuery);
    if (!startRef) return;

    setIsLoading(true);
    setCurrentStartRef(startRef);
    setVerses([]);

    try {
      const references = generateVerseReferences(startRef, 20);
      await loadVersesProgressively(references);
      setHasMore(references.length === 20);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load verses",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load more verses for pagination
  const loadMore = async () => {
    if (!currentStartRef || !hasMore) return;

    setIsLoading(true);
    try {
      const lastVerse = verses[verses.length - 1];
      const nextStartRef = getNextReference({
        book: lastVerse.book,
        chapter: lastVerse.chapter,
        verse: lastVerse.verse,
      });

      const references = generateVerseReferences(nextStartRef, 20);
      await loadVersesProgressively(references);
      setHasMore(references.length === 20);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load more verses",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pagination = {
    onLoadMore: loadMore,
    hasMore,
    pageSize: 20,
  };

  return (
    <List
      searchBarPlaceholder="Enter starting reference (e.g., John 3:16, John 3.16, or John 3)"
      onSearchTextChange={setQuery}
      searchText={query}
      isLoading={isLoading}
      filtering={false}
      isShowingDetail
      pagination={pagination}
      searchBarAccessory={<ModuleSelector onModuleChange={setSelectedModule} initialModule={selectedModule} />}
      actions={
        query && !isLoading ? (
          <ActionPanel>
            <Action title="Start Reading" onAction={() => handleSearch(query)} icon={Icon.Book} />
          </ActionPanel>
        ) : undefined
      }
    >
      <List.Section title="Bible Verses">
        {verses.map((verse, index) => (
          <List.Item
            id={`verse-${index}-${verse.reference}`}
            key={`verse-${index}`}
            icon={Icon.ShortParagraph}
            title={verse.reference}
            subtitle={verse.module}
            detail={<List.Item.Detail markdown={`# ${verse.reference}\n\n${verse.text}`} />}
            actions={
              <ActionPanel>
                <Action title="Start Reading" onAction={() => handleSearch(query)} icon={Icon.Book} />
                <Action.CopyToClipboard title="Copy Verse Text" content={`${verse.text}`} />
                <Action.CopyToClipboard title="Copy Reference Only" content={verse.reference} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
