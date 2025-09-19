import { useState, useEffect, useCallback } from "react";
import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  Clipboard,
  getPreferenceValues,
  open,
} from "@raycast/api";
import { AnswerResponse } from "exa-js";
import exa from "./exa";
import { typeid } from "typeid-js";

// Constants
const STORAGE_KEY_PREFIX = "exa_answer";

// Types
interface QA {
  id: string;
  question: string;
  response?: AnswerResponse;
  metadata?: Record<string, string>;
  createdAt: Date;
}

interface Preferences {
  apiKey: string;
  model: "exa" | "exa-pro";
}

// Utility functions
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// Main Component
export default function Command() {
  // State
  const [searchText, setSearchText] = useState("");
  const [selectedQA, setSelectedQA] = useState<QA | null>(null);
  const [allQAs, setAllQAs] = useState<QA[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Get preferences once
  const preferences = getPreferenceValues<Preferences>();

  // Load all saved QAs
  useEffect(() => {
    async function loadSavedQAs() {
      try {
        setIsLoading(true);
        const allItems = await LocalStorage.allItems();

        const qas: QA[] = Object.entries(allItems)
          .filter(([key]) => key.startsWith(STORAGE_KEY_PREFIX))
          .map(([_, value]) => {
            const qa = JSON.parse(value) as QA;

            // Ensure createdAt is a Date object
            if (!qa.createdAt) {
              // Default to now if missing
              qa.createdAt = new Date();
            } else if (typeof qa.createdAt === "string") {
              qa.createdAt = new Date(qa.createdAt);
            }

            return qa;
          });

        // Sort by timestamp (newest first)
        qas.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setAllQAs(qas);
      } catch (error) {
        console.error("Error loading saved QAs:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load saved Q&As",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadSavedQAs();
  }, []);

  // Ask a new question
  const askQuestion = useCallback(
    async (question: string): Promise<void> => {
      if (!question.trim()) return;

      const finalQuestion = question.trim();
      const id = typeid(STORAGE_KEY_PREFIX).toString();

      // Create QA object
      const newQA: QA = {
        id,
        question: finalQuestion,
        createdAt: new Date(),
        metadata: {
          model: preferences.model,
        },
      };

      // Add to pending questions
      setPendingQuestions((prev) => ({ ...prev, [id]: true }));

      // Add to state immediately and select it
      setAllQAs((prev) => [newQA, ...prev]);
      setSelectedQA(newQA);

      // Clear search text
      setSearchText("");

      // Show toast
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Getting answer from Exa...",
      });

      try {
        // Make API request
        const start = performance.now();
        const response = await exa.answer(finalQuestion, {
          text: true,
          model: preferences.model,
        });
        const latencyMs = performance.now() - start;

        // Update QA with response
        const updatedQA = {
          ...newQA,
          response,
          metadata: {
            ...newQA.metadata,
            latencyMs: latencyMs.toFixed(0),
          },
        };

        // Update state with the response
        setAllQAs((prev) => prev.map((qa) => (qa.id === id ? updatedQA : qa)));

        // If this QA is selected, update the selection
        if (selectedQA?.id === id) {
          setSelectedQA(updatedQA);
        }

        // Save to local storage
        await LocalStorage.setItem(id, JSON.stringify(updatedQA));

        // Update toast
        toast.style = Toast.Style.Success;
        toast.title = "Got answer";
        toast.message = `${latencyMs.toFixed(0)}ms`;
      } catch (error) {
        console.error("Error asking question:", error);

        // Remove from state if failed
        setAllQAs((prev) => prev.filter((qa) => qa.id !== id));

        if (selectedQA?.id === id) {
          setSelectedQA(null);
        }

        // Show error toast
        toast.style = Toast.Style.Failure;
        toast.title = "Error asking question";
        toast.message = error instanceof Error ? error.message : String(error);
      } finally {
        // Remove from pending questions
        setPendingQuestions((prev) => {
          const newPending = { ...prev };
          delete newPending[id];
          return newPending;
        });
      }
    },
    [preferences],
  );

  // Delete a QA
  const deleteQA = useCallback(
    async (id: string): Promise<void> => {
      try {
        await LocalStorage.removeItem(id);

        // Update our in-memory state
        setAllQAs((prev) => {
          const filtered = prev.filter((qa) => qa.id !== id);
          return filtered;
        });

        // Update selection if needed
        if (selectedQA?.id === id) {
          setSelectedQA(null);
        }

        await showToast({
          style: Toast.Style.Success,
          title: "QA deleted",
        });
      } catch (error) {
        console.error("Error deleting QA:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete QA",
        });
      }
    },
    [selectedQA],
  );

  // Handle clipboard copy
  const handleCopyText = useCallback(async (text: string) => {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard",
    });
  }, []);

  // Handle opening source URL
  const handleOpenSource = useCallback(async (qa: QA) => {
    if (qa.response?.citations && qa.response.citations.length > 0) {
      const url = qa.response.citations[0].url;
      await open(url);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "No sources available",
      });
    }
  }, []);

  // Generate markdown for detail view
  const generateMarkdown = useCallback((qa: QA | null, isPending: boolean): string => {
    if (!qa) return "Select a question or ask a new one to see answers here";

    let md = `## ${qa.question}\n\n`;

    if (!qa.response && isPending) {
      md += "_Loading answer..._";
    } else if (qa.response) {
      md += qa.response.answer;

      // Add citations
      if (qa.response.citations && qa.response.citations.length > 0) {
        md += "\n\n### Sources\n\n";
        qa.response.citations.forEach((citation, index) => {
          md += `${index + 1}. [${citation.title || "Source"}](${citation.url})\n`;
        });
      }
    } else {
      md += "_No answer available_";
    }

    // Add minimal metadata line in the format {qa.id} model:{model} {latency}ms}
    if (qa.metadata?.latencyMs && qa.metadata.latencyMs !== "0") {
      md += `\n\n${qa.id} model:${qa.metadata.model || "default"} ${qa.metadata.latencyMs}ms`;
    }

    return md;
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback(
    (id: string | null) => {
      if (!id) {
        setSelectedQA(null);
        return;
      }

      const qa = allQAs.find((qa) => qa.id === id);
      if (qa) {
        setSelectedQA(qa);
      }
    },
    [allQAs],
  );

  // Handle search bar submission
  const handleSubmit = useCallback(() => {
    if (searchText.trim()) {
      askQuestion(searchText);
    }
  }, [searchText, askQuestion]);

  // Filter QAs based on search text
  const filteredQAs = allQAs.filter(
    (qa) => !searchText.trim() || qa.question.toLowerCase().includes(searchText.toLowerCase()),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search history or ask a new question..."
      onSearchTextChange={setSearchText}
      searchText={searchText}
      // onSubmit={handleSubmit}
      isShowingDetail={selectedQA !== null}
      selectedItemId={selectedQA?.id}
      onSelectionChange={handleSelectionChange}
      navigationTitle="Exa Q&A"
      actions={
        <ActionPanel>
          <Action title="Get Answer" icon={Icon.Plus} onAction={handleSubmit} />
        </ActionPanel>
      }
    >
      {filteredQAs.map((qa) => (
        <List.Item
          key={qa.id}
          id={qa.id}
          title={qa.question}
          icon={pendingQuestions[qa.id] ? Icon.Clock : Icon.Bubble}
          accessories={[{ text: formatRelativeTime(qa.createdAt) }]}
          detail={
            <List.Item.Detail
              markdown={generateMarkdown(qa, pendingQuestions[qa.id] || false)}
              isLoading={pendingQuestions[qa.id] || false}
            />
          }
          actions={
            <ActionPanel>
              {qa.response?.citations && qa.response.citations.length > 0 ? (
                <Action
                  title="Open First Source"
                  icon={Icon.Globe}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  onAction={() => handleOpenSource(qa)}
                />
              ) : (
                <Action title="View Details" icon={Icon.Eye} onAction={() => setSelectedQA(qa)} />
              )}
              {qa.response && (
                <Action
                  title="Copy Answer"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopyText(qa.response.answer)}
                />
              )}
              <Action
                title="Copy Question"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() => handleCopyText(qa.question)}
              />
              <Action
                title="Ask Again"
                icon={Icon.Bubble}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => askQuestion(qa.question)}
              />
              <Action
                title="Delete"
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => deleteQA(qa.id)}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}

      {allQAs.length === 0 && (
        <List.EmptyView
          icon={Icon.Bubble}
          title="Ask Exa a question"
          description="Type your question in the search bar and press Enter"
        />
      )}
    </List>
  );
}
