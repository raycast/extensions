/**
 * Enhanced Error Data Models for Task 8.2
 * Structured representation of parsed Python errors from Daytona stderr
 */

/**
 * Represents a single frame in a Python stack trace
 */
export interface StackFrame {
  /** File path (usually "<stdin>" for inline code) */
  file: string;

  /** Line number where error occurred */
  line: number;

  /** Function name (optional, only for function calls) */
  functionName?: string;

  /** The actual code line that caused the error (when available) */
  codeContext?: string;
}

/**
 * Comprehensive structured representation of a Python execution error
 */
export interface StructuredPythonError {
  /** Type of Python error (e.g., "NameError", "TypeError") */
  errorType: string;

  /** Human-readable error message */
  message: string;

  /** Whether this error includes a traceback (runtime errors do, syntax errors don't) */
  hasTraceback: boolean;

  /** Stack trace frames (ordered from outermost to innermost call) */
  stackFrames: StackFrame[];

  /** For syntax errors: the problematic code line with position marker */
  syntaxContext?: {
    line: string;
    position?: number; // Position of the caret ^
  };

  /** Original raw stderr for debugging/fallback */
  rawStderr: string;

  /** Suggested fixes or common solutions (to be populated by formatter) */
  suggestions?: string[];
}

/**
 * Categories of Python errors for different handling strategies
 */
export enum ErrorCategory {
  /** Syntax errors: IndentationError, SyntaxError, TabError */
  SYNTAX = "syntax",

  /** Runtime errors: NameError, TypeError, ValueError, etc. */
  RUNTIME = "runtime",

  /** Import related: ImportError, ModuleNotFoundError */
  IMPORT = "import",

  /** System/resource errors: MemoryError, RecursionError */
  SYSTEM = "system",

  /** Unknown/unclassified errors */
  UNKNOWN = "unknown",
}

/**
 * Maps Python error types to categories
 */
export const ERROR_TYPE_MAPPING: Record<string, ErrorCategory> = {
  // Syntax errors
  SyntaxError: ErrorCategory.SYNTAX,
  IndentationError: ErrorCategory.SYNTAX,
  TabError: ErrorCategory.SYNTAX,

  // Runtime errors
  NameError: ErrorCategory.RUNTIME,
  TypeError: ErrorCategory.RUNTIME,
  ValueError: ErrorCategory.RUNTIME,
  ZeroDivisionError: ErrorCategory.RUNTIME,
  AttributeError: ErrorCategory.RUNTIME,
  KeyError: ErrorCategory.RUNTIME,
  IndexError: ErrorCategory.RUNTIME,
  FileNotFoundError: ErrorCategory.RUNTIME,

  // Import errors
  ImportError: ErrorCategory.IMPORT,
  ModuleNotFoundError: ErrorCategory.IMPORT,

  // System errors
  MemoryError: ErrorCategory.SYSTEM,
  RecursionError: ErrorCategory.SYSTEM,
  SystemExit: ErrorCategory.SYSTEM,
  KeyboardInterrupt: ErrorCategory.SYSTEM,
};

/**
 * Helper function to categorize an error type
 */
export function categorizeError(errorType: string): ErrorCategory {
  return ERROR_TYPE_MAPPING[errorType] || ErrorCategory.UNKNOWN;
}

/**
 * Common error patterns and their suggested solutions
 */
export const ERROR_SUGGESTIONS: Record<string, string[]> = {
  NameError: [
    "Check if the variable is defined before using it",
    "Verify correct spelling of variable names",
    "Make sure variables are in the correct scope",
  ],

  TypeError: [
    "Check that you're using the correct data type",
    "Verify function arguments match expected types",
    "Consider type conversion if needed",
  ],

  IndentationError: [
    "Use consistent indentation (4 spaces recommended)",
    "Check that all code blocks are properly indented",
    "Avoid mixing tabs and spaces",
  ],

  ImportError: [
    "Check if the module name is spelled correctly",
    "Verify the module is installed in your environment",
    "Use relative imports for local modules",
  ],

  ZeroDivisionError: [
    "Add a check to ensure the divisor is not zero",
    "Handle division by zero with conditional logic",
  ],
};

/**
 * Result of parsing stderr - either success with structured data or failure with raw text
 */
export type ParseResult =
  | { success: true; error: StructuredPythonError }
  | { success: false; rawStderr: string; reason: string };

/**
 * Configuration options for error parsing
 */
export interface ParseOptions {
  /** Include code context when available */
  includeContext?: boolean;

  /** Add suggested solutions to parsed errors */
  includeSuggestions?: boolean;

  /** Maximum number of stack frames to include */
  maxStackFrames?: number;
}
