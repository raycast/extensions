import { messages } from "@/locale/en/messages";
import type { CategorizedError } from "../types";

export interface ErrorPattern {
  keywords: string[];
  category: CategorizedError["category"];
  title: string;
  message: string;
  recoverable: boolean;
  suggestions: string[];
}

/**
 * Predefined error patterns for categorizing AI agent execution errors by keywords.
 * Provides categorization and recovery guidance for common error types across all supported AI agents.
 */
export const ERROR_PATTERNS: ErrorPattern[] = [
  {
    keywords: ["timeout", "timed out"],
    category: "timeout",
    title: messages.errors.timeoutError,
    message: messages.errors.agentTimeout,
    recoverable: true,
    suggestions: messages.errorRecovery.timeout,
  },
  {
    keywords: ["enoent", "command not found"],
    category: "not_found",
    title: messages.validation.configurationError,
    message: messages.errors.agentNotFound,
    recoverable: true,
    suggestions: messages.errorRecovery.notFound,
  },
  {
    keywords: ["permission", "eacces"],
    category: "permission",
    title: messages.errors.permissionError,
    message: messages.errors.permissionDenied,
    recoverable: true,
    suggestions: messages.errorRecovery.permission,
  },
  {
    keywords: ["authentication", "unauthorized"],
    category: "authentication",
    title: messages.errors.authenticationError,
    message: messages.errors.authFailed,
    recoverable: true,
    suggestions: messages.errorRecovery.authentication,
  },
  {
    keywords: ["network", "connection", "refused"],
    category: "network",
    title: messages.errors.networkError,
    message: "Network connection failed. Please check your internet connection and try again.",
    recoverable: true,
    suggestions: messages.errorRecovery.network,
  },
  {
    keywords: ["configuration", "config", "invalid"],
    category: "configuration",
    title: messages.errors.configurationError,
    message: "Configuration error detected. Please check your AI agent settings in preferences.",
    recoverable: true,
    suggestions: messages.errorRecovery.configuration,
  },
];

/**
 * Matches error messages against known patterns to categorize them by keywords.
 */
export function matchErrorPattern(message: string): ErrorPattern | null {
  const lowerMessage = message.toLowerCase();
  return ERROR_PATTERNS.find((pattern) => pattern.keywords.some((keyword) => lowerMessage.includes(keyword))) || null;
}

export function createParsingError(): CategorizedError {
  return {
    category: "parsing",
    title: messages.toast.responseProcessingFailed,
    message: messages.errors.malformedResponse,
    originalMessage: "The AI response could not be parsed correctly",
    recoverable: false,
    suggestions: messages.errorRecovery.parsing,
  };
}

export function createUnknownError(message: string): CategorizedError {
  return {
    category: "unknown",
    title: messages.toast.processingFailed,
    message,
    originalMessage: "An unknown error occurred during processing",
    recoverable: false,
    suggestions: messages.errorRecovery.unknown,
  };
}
