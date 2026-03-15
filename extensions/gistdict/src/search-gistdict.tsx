import { AI, ActionPanel, Action, List, Detail, Icon, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";

interface HistoryEntry {
  word: string;
  definition: string;
  fullResponse: string;
  timestamp: number;
}

interface Preferences {
  targetLanguage: string;
  enableTranslation: boolean;
}

function buildPrompt(word: string, targetLanguage: string, enableTranslation: boolean): string {
  if (enableTranslation) {
    return `I'm improving my English vocabulary. Follow this exact pattern for the input '${word}':
Examples:
Input: savant
Output:
savant
scholar; expert
учёный; знаток

Input: verve
Output:
verve
enthusiasm; vigor
энтузиазм; пыл

Input: wit
Output:
wit
cleverness; humor
остроумие; ум

Input: nibleness
Output:
nimbleness
agility; quickness
проворство; подвижность

Input: probity
Output:
probity
integrity; honesty
честность; неподкупность

Current Task:
Input: ${word}

CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
1. Line 1: Correctly spelled word ONLY
   - Use lowercase UNLESS it's a proper noun
2. Line 2: EXACTLY two synonyms separated by SEMICOLON and SPACE ("; ")
   - Format: "word1; word2"
   - Use lowercase for all words
   - NO commas, NO "or", NO "and", NO slashes
   - ONLY semicolon with space
3. Line 3: EXACTLY two ${targetLanguage} translations separated by SEMICOLON and SPACE ("; ")
   - Format: "перевод1; перевод2"
   - Use lowercase for all words
   - NO commas, NO alternatives, NO other punctuation
4. NO labels, NO numbers, NO extra text
5. Reply with EXACTLY 3 lines - nothing more, nothing less

Output MUST match this exact pattern:
[word]
[synonym1; synonym2]
[translation1; translation2]`;
  }

  return `I'm improving my English vocabulary. Follow this exact pattern for the input '${word}':
Examples:
Input: savant
Output:
savant
scholar; expert

Input: verve
Output:
verve
enthusiasm; vigor

Input: wit
Output:
wit
cleverness; humor

Input: nibleness
Output:
nimbleness
agility; quickness

Input: probity
Output:
probity
integrity; honesty

Current Task:
Input: ${word}

CRITICAL FORMATTING RULES - FOLLOW EXACTLY:
1. Line 1: Correctly spelled word ONLY
   - Use lowercase UNLESS it's a proper noun
2. Line 2: EXACTLY two synonyms separated by SEMICOLON and SPACE ("; ")
   - Format: "word1; word2"
   - Use lowercase for all words
   - NO commas, NO "or", NO "and", NO slashes
   - ONLY semicolon with space
3. NO labels, NO numbers, NO extra text
4. Reply with EXACTLY 2 lines - nothing more, nothing less

Output MUST match this exact pattern:
[word]
[synonym1; synonym2]`;
}

function parseResponse(response: string): { word: string; definition: string; fullResponse: string } {
  const lines = response
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const word = lines[0] ?? "";
  const definition = lines.slice(1).join("\n");
  const fullResponse = response.trim();

  return { word, definition, fullResponse };
}

function GetGistDetail({
  word,
  targetLanguage,
  enableTranslation,
}: {
  word: string;
  targetLanguage: string;
  enableTranslation: boolean;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  const [, setHistory] = useCachedState<HistoryEntry[]>("gist-history", []);

  useEffect(() => {
    async function fetchGist() {
      try {
        const prompt = buildPrompt(word, targetLanguage, enableTranslation);
        const response = await AI.ask(prompt, { model: AI.Model["Google_Gemini_3_Flash"] });
        const parsed = parseResponse(response);

        if (!parsed.word || !parsed.definition) {
          throw new Error("Could not parse AI response");
        }

        const newEntry: HistoryEntry = {
          word: parsed.word,
          definition: parsed.definition,
          fullResponse: parsed.fullResponse,
          timestamp: Date.now(),
        };

        // Save to history using useCachedState
        setHistory((prev: HistoryEntry[]) => [
          newEntry,
          ...prev.filter((e: HistoryEntry) => e.word.toLowerCase() !== parsed.word.toLowerCase()),
        ]);

        setEntry(newEntry);
        showToast({ style: Toast.Style.Success, title: "Gist saved", message: parsed.word });
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to get gist", message: String(error) });
      } finally {
        setIsLoading(false);
      }
    }

    fetchGist();
  }, [word, targetLanguage, enableTranslation, setHistory]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Getting gist..." />;
  }

  if (!entry) {
    return <Detail markdown="Failed to get gist" />;
  }

  return <WordDetail entry={entry} />;
}

function WordDetail({ entry }: { entry: HistoryEntry }) {
  const fullResponse = entry.fullResponse || `${entry.word}\n${entry.definition}`;
  const [word, definition, translation] = fullResponse.split("\n");

  const markdown = `
# ${word}
${definition}
${translation ? `\n\n* * *\n\n*${translation}*` : ""}
`;

  return <Detail markdown={markdown} />;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [history, setHistory] = useCachedState<HistoryEntry[]>("gist-history", []);
  const { targetLanguage, enableTranslation } = getPreferenceValues<Preferences>();
  const previousLanguage = useRef<string>(targetLanguage);

  // Migrate existing entries without fullResponse
  useEffect(() => {
    const needsMigration = history.some((entry: HistoryEntry) => !entry.fullResponse);
    if (needsMigration) {
      setHistory((prev: HistoryEntry[]) =>
        prev.map((entry: HistoryEntry) => ({
          ...entry,
          fullResponse: entry.fullResponse || `${entry.word}\n${entry.definition}`,
        })),
      );
    }
  }, []); // Run only once on mount

  // Re-translate all entries when targetLanguage changes (only when it actually changes)
  useEffect(() => {
    // Only re-translate if translation is enabled AND language actually changed
    if (!enableTranslation || history.length === 0 || targetLanguage === previousLanguage.current) return;

    const retranslateEntries = async () => {
      try {
        const updatedEntries = await Promise.all(
          history.map(async (entry) => {
            const prompt = buildPrompt(entry.word, targetLanguage, enableTranslation);
            const response = await AI.ask(prompt, { model: AI.Model["Google_Gemini_3_Flash"] });
            const parsed = parseResponse(response);

            if (parsed.word && parsed.definition) {
              return {
                ...entry,
                fullResponse: parsed.fullResponse,
                definition: parsed.definition,
              };
            }

            return entry; // Return original if translation fails
          }),
        );

        setHistory(updatedEntries);
        showToast({
          style: Toast.Style.Success,
          title: "Translations updated",
          message: `Updated to ${targetLanguage}`,
        });
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Failed to update translations", message: String(error) });
      }
    };

    retranslateEntries();
    previousLanguage.current = targetLanguage; // Update previous language
  }, [targetLanguage, enableTranslation]); // Re-run when targetLanguage changes

  const trimmed = searchText.trim();
  const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);

  const filteredHistory = trimmed
    ? sortedHistory.filter((e) => e.word.toLowerCase().includes(trimmed.toLowerCase()))
    : sortedHistory.slice(0, 30);

  const wordInHistory = history.some((e: HistoryEntry) => e.word.toLowerCase() === trimmed.toLowerCase());
  const showGetGist = trimmed.length > 0 && !wordInHistory;

  function deleteEntry(word: string) {
    setHistory((prev: HistoryEntry[]) => prev.filter((e: HistoryEntry) => e.word !== word));
  }

  return (
    <List searchBarPlaceholder="Type a word to define..." onSearchTextChange={setSearchText} isShowingDetail>
      {showGetGist && (
        <List.Item
          icon={Icon.Stars}
          title={`Get Gist for "${trimmed}"`}
          detail={<List.Item.Detail markdown={`# ${trimmed}\n\nPress Enter to get definition...`} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="Get Gist"
                icon={Icon.Stars}
                target={
                  <GetGistDetail word={trimmed} targetLanguage={targetLanguage} enableTranslation={enableTranslation} />
                }
              />
            </ActionPanel>
          }
        />
      )}
      {filteredHistory.length > 0 && (
        <List.Section
          title={trimmed ? "History" : "Recent"}
          subtitle={trimmed ? undefined : `${sortedHistory.length} entries`}
        >
          {filteredHistory.map((entry) => {
            const fullResponse = entry.fullResponse || `${entry.word}\n${entry.definition}`;
            const [word, definition, translation] = fullResponse.split("\n");
            const detailMarkdown = `# ${word}\n${definition}${translation ? `\n\n* * *\n\n*${translation}*` : ""}`;

            return (
              <List.Item
                key={`${entry.word}-${entry.timestamp}`}
                icon={Icon.Book}
                title={entry.word}
                accessories={[{ date: new Date(entry.timestamp), tooltip: new Date(entry.timestamp).toLocaleString() }]}
                detail={<List.Item.Detail markdown={detailMarkdown} />}
                actions={
                  <ActionPanel>
                    <Action.Push title="View Definition" icon={Icon.Book} target={<WordDetail entry={entry} />} />
                    <Action
                      title="Delete Entry"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => deleteEntry(entry.word)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
