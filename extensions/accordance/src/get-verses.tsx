import { ActionPanel, List, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { ModuleSelector } from "./components/ModuleSelector";
import { fetchModules } from "./utils/moduleUtils";
import { cleanVerseText, normalizeReference, validateReference } from "./utils/bibleUtils";
import { generateAccordanceAppleScript } from "./utils/applescriptUtils";

interface VerseResult {
  reference: string;
  text: string;
  module: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VerseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState(preferences.defaultText); // Will be updated when modules load
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Handle initial selection of cached results
  useEffect(() => {
    if (isInitialLoad && results.length > 0) {
      setSelectedItemId(`verse-0-${results[0].reference}-${results[0].module}`);
      setIsInitialLoad(false);
    }
  }, [results, isInitialLoad]);

  async function fetchVerses(reference: string) {
    const validation = validateReference(reference);
    if (!validation.isValid) {
      await showFailureToast(validation.error!);
      setResults([]);
      setSelectedItemId(undefined);
      return;
    }

    setIsLoading(true);
    try {
      // Clean the input reference using JavaScript (simpler than AppleScript)
      const cleanReference = normalizeReference(reference);

      // Generate safe AppleScript for Accordance
      const appleScript = generateAccordanceAppleScript(selectedModule, cleanReference);

      const stdout = await runAppleScript(appleScript);

      if (stdout.trim().startsWith("Error:")) {
        await showFailureToast(stdout.trim().substring(7));
        setResults([]);
        setSelectedItemId(undefined);
      } else {
        const result: VerseResult = {
          reference: cleanReference,
          text: cleanVerseText(stdout.trim()),
          module: selectedModule,
        };
        setResults((prev) => {
          // Check if this result is already in the list
          const existingIndex = prev.findIndex((r) => r.reference === result.reference && r.module === result.module);
          if (existingIndex >= 0) {
            // Move existing result to the top
            const newResults = [...prev];
            const [existingResult] = newResults.splice(existingIndex, 1);
            return [existingResult, ...newResults];
          } else {
            // Add new result to the top
            return [result, ...prev];
          }
        });
        // Set selectedItemId after results update
        setTimeout(() => setSelectedItemId(`verse-0-${cleanReference}-${selectedModule}`), 0);
      }
    } catch (error) {
      await showFailureToast(error instanceof Error ? error.message : String(error));
      setResults([]);
      setSelectedItemId(undefined);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <List
      searchBarPlaceholder="Acts 2.38"
      onSearchTextChange={setQuery}
      searchText={query}
      isLoading={isLoading}
      filtering={false}
      isShowingDetail
      selectedItemId={selectedItemId}
      searchBarAccessory={<ModuleSelector onModuleChange={setSelectedModule} initialModule={selectedModule} />}
      actions={
        query && !isLoading && results.length === 0 ? (
          <ActionPanel>
            <Action title="Get Verse" onAction={() => fetchVerses(query)} icon={Icon.Book} />
          </ActionPanel>
        ) : undefined
      }
    >
      <List.Section title="Search Results">
        {results.map((verse, index) => (
          <List.Item
            id={`verse-${index}-${verse.reference}-${verse.module}`}
            key={`result-${index}`}
            icon={Icon.ShortParagraph}
            title={verse.reference}
            subtitle={verse.module}
            detail={<List.Item.Detail markdown={`# ${verse.reference}\n\n${verse.text}`} />}
            actions={
              <ActionPanel>
                <Action title="Get Verse" onAction={() => fetchVerses(query)} icon={Icon.Book} />
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
