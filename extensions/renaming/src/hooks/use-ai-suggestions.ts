/**
 * AI-powered file naming suggestions hook
 *
 * Uses Raycast AI to generate descriptive filenames based on file metadata.
 * Requires Raycast Pro subscription.
 */

import { useState, useCallback, useEffect } from "react";
import { AI, environment, showToast, Toast } from "@raycast/api";
import { AISuggestionStatus, type FileInfo, type AISuggestion, type FileMetadataContext } from "../types";
import { getAIPromptForFile, cleanSuggestedName } from "../lib/ai-prompts";
import { getUserFriendlyErrorMessage } from "../lib/errors";
import { log } from "../lib/logger";

export interface UseAISuggestionsOptions {
  /** Files to generate suggestions for */
  files: FileInfo[];
  /** Optional metadata for each file */
  metadata?: Map<string, FileMetadataContext>;
}

export interface UseAISuggestionsResult {
  /** Current suggestions state */
  suggestions: AISuggestion[];
  /** Whether any suggestions are currently loading */
  isLoading: boolean;
  /** Whether AI is available (Raycast Pro) */
  isAIAvailable: boolean;
  /** Generate suggestions for all files */
  generateAll: () => Promise<void>;
  /** Generate suggestion for a single file */
  generateOne: (filePath: string) => Promise<void>;
  /** Update a suggestion manually */
  updateSuggestion: (filePath: string, newName: string) => void;
  /** Accept a suggestion (mark as final) */
  acceptSuggestion: (filePath: string) => void;
  /** Clear all suggestions */
  clearSuggestions: () => void;
}

/**
 * Hook for generating AI-powered file naming suggestions
 */
export function useAISuggestions({ files, metadata }: UseAISuggestionsOptions): UseAISuggestionsResult {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if AI is available (Raycast Pro)
  const isAIAvailable = environment.canAccess(AI);

  // Sync suggestions with files when files change
  useEffect(() => {
    setSuggestions(
      files.map((file) => ({
        filePath: file.path,
        originalName: file.baseName,
        suggestedName: "",
        status: AISuggestionStatus.PENDING,
      })),
    );
  }, [files]);

  /**
   * Generate a suggestion for a single file
   */
  const generateOne = useCallback(
    async (filePath: string) => {
      if (!isAIAvailable) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AI Not Available",
          message: "Raycast Pro subscription required",
        });
        return;
      }

      const file = files.find((f) => f.path === filePath);
      if (!file) return;

      // Update status to loading
      setSuggestions((prev) =>
        prev.map((s) => (s.filePath === filePath ? { ...s, status: AISuggestionStatus.LOADING } : s)),
      );

      try {
        const fileMetadata = metadata?.get(filePath);
        const promptConfig = getAIPromptForFile(file, fileMetadata);

        const response = await AI.ask(promptConfig.prompt, {
          creativity: "low",
          model: AI.Model["OpenAI_GPT4o-mini"],
        });

        const suggestedName = cleanSuggestedName(response);

        setSuggestions((prev) =>
          prev.map((s) => (s.filePath === filePath ? { ...s, suggestedName, status: AISuggestionStatus.SUCCESS } : s)),
        );
      } catch (error) {
        log.ai.error(`Failed to generate AI suggestion for "${file.baseName}"`, error);
        const errorMessage = getUserFriendlyErrorMessage(error);

        setSuggestions((prev) =>
          prev.map((s) =>
            s.filePath === filePath ? { ...s, status: AISuggestionStatus.ERROR, error: errorMessage } : s,
          ),
        );
      }
    },
    [files, metadata, isAIAvailable],
  );

  /**
   * Generate suggestions for all files
   */
  const generateAll = useCallback(async () => {
    if (!isAIAvailable) {
      await showToast({
        style: Toast.Style.Failure,
        title: "AI Not Available",
        message: "Raycast Pro subscription required",
      });
      return;
    }

    setIsLoading(true);

    // Set all to loading
    setSuggestions((prev) => prev.map((s) => ({ ...s, status: AISuggestionStatus.LOADING, error: undefined })));

    // Process files sequentially to avoid rate limits
    for (const file of files) {
      await generateOne(file.path);
    }

    setIsLoading(false);
  }, [files, generateOne, isAIAvailable]);

  /**
   * Manually update a suggestion
   */
  const updateSuggestion = useCallback((filePath: string, newName: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.filePath === filePath ? { ...s, suggestedName: newName, status: AISuggestionStatus.SUCCESS } : s,
      ),
    );
  }, []);

  /**
   * Accept a suggestion (mark as complete)
   */
  const acceptSuggestion = useCallback((filePath: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.filePath === filePath ? { ...s, status: AISuggestionStatus.SUCCESS } : s)),
    );
  }, []);

  /**
   * Clear all suggestions
   */
  const clearSuggestions = useCallback(() => {
    setSuggestions(
      files.map((file) => ({
        filePath: file.path,
        originalName: file.baseName,
        suggestedName: "",
        status: AISuggestionStatus.PENDING,
      })),
    );
  }, [files]);

  return {
    suggestions,
    isLoading,
    isAIAvailable,
    generateAll,
    generateOne,
    updateSuggestion,
    acceptSuggestion,
    clearSuggestions,
  };
}

/**
 * Check if AI features are available
 */
export function isAIAvailable(): boolean {
  return environment.canAccess(AI);
}
