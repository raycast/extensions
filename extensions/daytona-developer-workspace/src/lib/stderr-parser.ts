/**
 * Task 8.3: Python stderr Parser Implementation
 * Converts raw stderr output into structured StructuredPythonError objects
 */

import {
  StructuredPythonError,
  StackFrame,
  ParseResult,
  ParseOptions,
  ERROR_SUGGESTIONS,
  categorizeError,
} from "./enhanced-error-types";

/**
 * Main parser function - converts raw stderr to StructuredPythonError
 */
export function parseStderr(rawStderr: string, options: ParseOptions = {}): ParseResult {
  if (!rawStderr || rawStderr.trim() === "") {
    return {
      success: false,
      rawStderr,
      reason: "Empty stderr",
    };
  }

  try {
    const lines = rawStderr.trim().split("\n");

    // Determine error type - syntax errors vs runtime errors
    if (lines[0].startsWith("Traceback (most recent call last):")) {
      return parseRuntimeError(lines, rawStderr, options);
    } else {
      return parseSyntaxError(lines, rawStderr, options);
    }
  } catch (error) {
    return {
      success: false,
      rawStderr,
      reason: `Parsing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse runtime errors (with traceback)
 */
function parseRuntimeError(lines: string[], rawStderr: string, options: ParseOptions): ParseResult {
  const stackFrames: StackFrame[] = [];
  let errorType = "UnknownError";
  let message = "Unknown error occurred";

  // Skip the "Traceback" line
  let i = 1;

  // Parse stack frames
  while (i < lines.length) {
    const line = lines[i];

    // Check if this is a file reference line
    const fileMatch = line.match(/^\s*File "([^"]+)", line (\d+)(?:, in (.+))?/);
    if (fileMatch) {
      const frame: StackFrame = {
        file: fileMatch[1],
        line: parseInt(fileMatch[2]),
        functionName: fileMatch[3],
      };

      // Next line might contain code context
      if (i + 1 < lines.length && !lines[i + 1].match(/^\s*File|^\w+Error:/)) {
        frame.codeContext = lines[i + 1].trim();
        i++; // Skip the context line
      }

      stackFrames.push(frame);
    }
    // Check if this is the final error line
    else if (line.match(/^\w+Error:/)) {
      const errorMatch = line.match(/^(\w+Error): (.+)$/);
      if (errorMatch) {
        errorType = errorMatch[1];
        message = errorMatch[2];
      }
      break;
    }

    i++;
  }

  // Apply stack frame limit if specified
  const maxFrames = options.maxStackFrames || 20;
  const limitedFrames = stackFrames.slice(-maxFrames); // Keep most recent frames

  const structuredError: StructuredPythonError = {
    errorType,
    message,
    hasTraceback: true,
    stackFrames: limitedFrames,
    rawStderr,
    suggestions: options.includeSuggestions ? ERROR_SUGGESTIONS[errorType] || [] : undefined,
  };

  return { success: true, error: structuredError };
}

/**
 * Parse syntax errors (no traceback)
 */
function parseSyntaxError(lines: string[], rawStderr: string, options: ParseOptions): ParseResult {
  let errorType = "SyntaxError";
  let message = "Syntax error occurred";
  let file = "<stdin>";
  let line = 1;
  let codeContext: string | undefined;
  let caretPosition: number | undefined;
  let foundValidError = false;

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];

    // Parse file reference
    const fileMatch = currentLine.match(/^\s*File "([^"]+)", line (\d+)/);
    if (fileMatch) {
      file = fileMatch[1];
      line = parseInt(fileMatch[2]);
    }

    // Look for code context (line after file reference, before error)
    else if (currentLine.trim() && !currentLine.includes("Error:") && !currentLine.includes("^")) {
      if (options.includeContext) {
        codeContext = currentLine.trim();
      }
    }

    // Look for caret position marker
    else if (currentLine.includes("^")) {
      caretPosition = currentLine.indexOf("^");
    }

    // Parse final error line
    else if (currentLine.match(/^\w+Error:/)) {
      const errorMatch = currentLine.match(/^(\w+Error): (.+)$/);
      if (errorMatch) {
        errorType = errorMatch[1];
        message = errorMatch[2];
        foundValidError = true;
      }
      break;
    }
  }

  // If we didn't find a valid Python error pattern, fail
  if (!foundValidError) {
    return {
      success: false,
      rawStderr,
      reason: "No valid Python error pattern found",
    };
  }

  const stackFrame: StackFrame = {
    file,
    line,
    codeContext,
  };

  const structuredError: StructuredPythonError = {
    errorType,
    message,
    hasTraceback: false,
    stackFrames: [stackFrame],
    syntaxContext: codeContext
      ? {
          line: codeContext,
          position: caretPosition,
        }
      : undefined,
    rawStderr,
    suggestions: options.includeSuggestions ? ERROR_SUGGESTIONS[errorType] || [] : undefined,
  };

  return { success: true, error: structuredError };
}

/**
 * Enhanced parser with error categorization and advanced options
 */
export function parseStderrEnhanced(
  rawStderr: string,
  options: ParseOptions = {},
): ParseResult & { category?: string } {
  const baseResult = parseStderr(rawStderr, {
    includeContext: true,
    includeSuggestions: true,
    maxStackFrames: 10,
    ...options,
  });

  if (baseResult.success) {
    const category = categorizeError(baseResult.error.errorType);
    return {
      ...baseResult,
      category,
    };
  }

  return baseResult;
}

/**
 * Utility function to extract just the error type and message for quick analysis
 */
export function extractErrorSummary(rawStderr: string): { type: string; message: string } | null {
  const errorMatch = rawStderr.match(/(\w+Error): (.+)$/m);
  if (errorMatch) {
    return {
      type: errorMatch[1],
      message: errorMatch[2],
    };
  }
  return null;
}
