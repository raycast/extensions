import { ActionPanel, List, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { ModuleSelector } from "./components/ModuleSelector";
import { fetchModules } from "./utils/moduleUtils";
import { validateReference, findBookData, normalizeReference, Reference } from "./utils/bibleUtils";
import { generateAccordanceAppleScript } from "./utils/applescriptUtils";
import { BibleData } from "./components/BibleData";

interface VerseResult {
  reference: string;
  text: string;
  module: string;
  book: string;
  chapter: number;
  verse: number;
}

// Global cache for verses - persists across component renders
const verseCache = new Map<string, VerseResult>();

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
  const loadVersesProgressively = async (references: Reference[]): Promise<number> => {
    let loadedCount = 0;

    for (const ref of references) {
      const cacheKey = `${selectedModule}-${ref.book}-${ref.chapter}-${ref.verse}`;

      if (verseCache.has(cacheKey)) {
        const cachedVerse = verseCache.get(cacheKey)!;
        setVerses((prev) => [...prev, cachedVerse]);
        loadedCount++;
        continue;
      }

      // Add delay between calls to avoid overwhelming Accordance
      await new Promise((resolve) => setTimeout(resolve, 50));

      try {
        const referenceString = normalizeReference(`${ref.book} ${ref.chapter}:${ref.verse}`);
        const appleScript = generateAccordanceAppleScript(selectedModule, referenceString);

        const stdout = await runAppleScript(appleScript);

        if (stdout.trim().startsWith("Error:")) {
          console.error(`Error loading ${ref.book} ${ref.chapter}:${ref.verse}:`, stdout.trim());
          // Create an error verse to show in the UI
          const errorVerse: VerseResult = {
            reference: normalizeReference(`${ref.book} ${ref.chapter}:${ref.verse}`),
            text: `❌ Failed to load verse: ${stdout.trim().substring(7)}`,
            module: selectedModule,
            book: ref.book,
            chapter: ref.chapter,
            verse: ref.verse,
          };
          setVerses((prev) => [...prev, errorVerse]);
          continue;
        }

        const result: VerseResult = {
          reference: normalizeReference(`${ref.book} ${ref.chapter}:${ref.verse}`),
          text: cleanVerseText(stdout.trim()),
          module: selectedModule,
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
        };

        verseCache.set(cacheKey, result);
        setVerses((prev) => [...prev, result]);
        loadedCount++;
      } catch (error) {
        console.error(`Failed to load ${ref.book} ${ref.chapter}:${ref.verse}:`, error);
        // Create an error verse to show in the UI
        const errorVerse: VerseResult = {
          reference: `${ref.book} ${ref.chapter}:${ref.verse}`,
          text: `❌ Failed to load verse: ${error instanceof Error ? error.message : String(error)}`,
          module: selectedModule,
          book: ref.book,
          chapter: ref.chapter,
          verse: ref.verse,
        };
        setVerses((prev) => [...prev, errorVerse]);
      }
    }

    return loadedCount;
  };

  // Handle search input
  const handleSearch = async (searchQuery: string) => {
    const validation = validateReference(searchQuery);
    if (!validation.isValid) {
      await showFailureToast(validation.error!);
      return;
    }

    setIsLoading(true);
    setCurrentStartRef(validation.reference!);
    setVerses([]);

    try {
      const references = generateVerseReferences(validation.reference!, 20);
      const loadedCount = await loadVersesProgressively(references);
      setHasMore(references.length === 20 && loadedCount === references.length);
    } catch {
      await showFailureToast("Failed to load verses");
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
      const loadedCount = await loadVersesProgressively(references);
      setHasMore(references.length === 20 && loadedCount === references.length);
    } catch {
      await showFailureToast("Failed to load more verses");
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
