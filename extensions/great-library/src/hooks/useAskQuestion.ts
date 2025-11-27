import { Toast, showToast } from "@raycast/api";
import type { Content } from "@google/genai";
import { useCallback, useEffect, useState } from "react";
import { randomUUID } from "node:crypto";
import { getDocuments } from "../lib/cache";
import {
  buildAskHistory,
  CitationEntry,
  DEFAULT_MAX_CONTEXT_MESSAGES,
  describeGroundingChunk,
  runAskFlow,
  truncate,
} from "../lib/ask";
import type { StoredDocument } from "../lib/types";

export type QaEntry = {
  id: string;
  question: string;
  status: "pending" | "ready" | "error";
  answer?: string;
  error?: string;
  citations: CitationEntry[];
  createdAt: string;
};

interface UseAskQuestionReturn {
  // State
  entries: QaEntry[];
  conversation: Content[];
  isLoading: boolean;
  documents: StoredDocument[];

  // Actions
  ask: (question: string) => Promise<void>;
  clearHistory: () => void;
}

/**
 * Custom hook for managing Q&A interactions with documents
 * Handles conversation state, history, and API calls
 */
export function useAskQuestion(maxContextMessages = DEFAULT_MAX_CONTEXT_MESSAGES): UseAskQuestionReturn {
  const [entries, setEntries] = useState<QaEntry[]>([]);
  const [conversation, setConversation] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);

  // Load cached documents on mount
  useEffect(() => {
    getDocuments()
      .then(setDocuments)
      .catch((error) => console.error("[useAskQuestion] Failed to load cached documents", error));
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const trimmedQuestion = question.trim();
      if (!trimmedQuestion || isLoading) {
        return;
      }

      console.log("[useAskQuestion] Asking question", { question: trimmedQuestion });

      const entryId = randomUUID();
      const createdAt = new Date().toISOString();

      // Add pending entry immediately for optimistic UI
      setEntries((prev) => [
        {
          id: entryId,
          question: trimmedQuestion,
          status: "pending",
          citations: [],
          createdAt,
        },
        ...prev,
      ]);

      setIsLoading(true);
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Searching documents...",
      });

      try {
        const history = buildAskHistory(trimmedQuestion, conversation);

        console.log("[useAskQuestion] Sending request", {
          historyCount: history.length,
          questionLength: trimmedQuestion.length,
          documentCount: documents.length,
        });

        const {
          answer,
          citations,
          metadata,
          modelContent,
          store,
          conversation: updatedConversation,
        } = await runAskFlow({
          question: trimmedQuestion,
          conversation,
          history,
          documents,
          maxContextMessages,
        });

        // Log response details
        console.log("[useAskQuestion] Using file search store", {
          storeName: store.name,
          storeDisplayName: store.displayName ?? "(no display name)",
        });

        console.log("[useAskQuestion] Received response", {
          answerPreview: answer ? `${answer.slice(0, 80)}${answer.length > 80 ? "…" : ""}` : null,
          citationCount: citations.length,
          groundingChunkCount: metadata?.groundingChunks?.length ?? 0,
          searchQueryCount: metadata?.webSearchQueries?.length ?? 0,
          toolCalls: modelContent?.parts?.filter((part) => part?.inlineData || part?.functionCall).length ?? 0,
        });

        if (metadata?.groundingChunks?.length) {
          console.log("[useAskQuestion] Grounding chunks", metadata.groundingChunks.map(describeGroundingChunk));
        }

        if (citations.length) {
          console.log(
            "[useAskQuestion] Citations",
            citations.map((citation) => ({
              documentId: citation.documentId,
              documentName: citation.documentName,
              snippetPreview: truncate(citation.snippet),
              uri: citation.uri,
            })),
          );
        }

        // Update conversation history
        setConversation(updatedConversation);

        // Update entry with answer
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: "ready",
                  answer: answer || "_The model returned no answer._",
                  citations,
                }
              : entry,
          ),
        );

        toast.style = Toast.Style.Success;
        toast.title = "Answer ready";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Update entry with error
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  status: "error",
                  error: message,
                }
              : entry,
          ),
        );

        toast.style = Toast.Style.Failure;
        toast.title = "Question failed";
        toast.message = message;
        console.error("[useAskQuestion] Ask command failed", error);
      } finally {
        setIsLoading(false);
      }
    },
    [conversation, documents, isLoading, maxContextMessages],
  );

  const clearHistory = useCallback(() => {
    setEntries([]);
    setConversation([]);
  }, []);

  return {
    entries,
    conversation,
    isLoading,
    documents,
    ask,
    clearHistory,
  };
}
