import { useCallback } from "react";

import type { CategorizedError } from "../types";
import {
  createParsingError,
  createUnknownError,
  getRecoveryActions,
  matchErrorPattern,
  showCategorizedErrorToast,
  showRecoveryToast,
} from "@/agents";

export interface ErrorContext {
  executionId?: string;
  isAdditionalVariant?: boolean;
  operation?: "processing" | "validation" | "execution" | "parsing";
  inputLength?: number;
  responsePreview?: string;
}

// CategorizedError interface is imported from ../types

export interface UseAgentErrorHandlingReturn {
  categorizeError: (error: Error, context?: ErrorContext) => CategorizedError;
  handleError: (error: Error, context?: ErrorContext) => void;
  showCategorizedErrorToast: (categorizedError: CategorizedError) => void;
  recoverFromError: (error: CategorizedError, context?: ErrorContext) => boolean;
  getRecoveryActions: (error: CategorizedError) => string[];
}

/**
 * Provides error categorization, recovery mechanisms, and user-friendly error reporting for agent operations.
 */
export function useAgentErrorHandling(): UseAgentErrorHandlingReturn {
  const categorizeError = useCallback((error: Error, context?: ErrorContext): CategorizedError => {
    // Check for parsing errors first (context-dependent)
    if (context?.operation === "parsing") {
      return createParsingError();
    }

    // Try to match against known error patterns
    const pattern = matchErrorPattern(error.message);
    if (pattern) {
      return {
        category: pattern.category,
        title: pattern.title,
        message: pattern.message,
        originalMessage: error.message,
        recoverable: pattern.recoverable,
        suggestions: pattern.suggestions,
      };
    }

    // Fall back to unknown error
    return createUnknownError(error.message);
  }, []);

  const showCategorizedErrorToastCallback = useCallback((categorizedError: CategorizedError) => {
    showCategorizedErrorToast(categorizedError);
  }, []);

  const handleError = useCallback(
    (error: Error, context?: ErrorContext) => {
      const categorizedError = categorizeError(error, context);
      showCategorizedErrorToastCallback(categorizedError);
    },
    [categorizeError, showCategorizedErrorToastCallback]
  );

  const getRecoveryActionsForError = (error: CategorizedError): string[] => {
    return getRecoveryActions(error);
  };

  const recoverFromError = useCallback((error: CategorizedError): boolean => {
    showRecoveryToast(error.category);
    return error.recoverable;
  }, []);

  return {
    categorizeError,
    handleError,
    showCategorizedErrorToast: showCategorizedErrorToastCallback,
    recoverFromError,
    getRecoveryActions: getRecoveryActionsForError,
  };
}
