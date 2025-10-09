/**
 * Code execution types
 * Centralized definitions for code execution, runtime environments, and results
 */

export type Language = "python" | "javascript" | "typescript" | "shell" | "bash" | "go" | "rust" | "java";

export type ExecutionMode = "ephemeral" | "persistent" | "interactive";

export interface CodeExecutionRequest {
  code: string;
  language: Language;
  mode?: ExecutionMode;
  sandboxId?: string;
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeout?: number;
  saveToHistory?: boolean;
}

export interface CodeExecutionResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime?: number;
  artifacts?: ExecutionArtifact[];
  error?: ExecutionError;
  metadata?: Record<string, unknown>;
}

export interface ExecutionArtifact {
  name: string;
  type: "image" | "chart" | "table" | "file" | "html" | "json" | "text";
  content: string;
  encoding?: "base64" | "utf-8";
  mimeType?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionError {
  type: "syntax" | "runtime" | "timeout" | "network" | "system" | "permission" | "memory" | "unknown";
  message: string;
  details?: string;
  line?: number;
  column?: number;
  stackTrace?: StackFrame[];
  suggestions?: string[];
  code?: string;
}

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column?: number;
  code?: string;
}

export interface ExecutionTemplate {
  id: string;
  name: string;
  description?: string;
  language: Language;
  code: string;
  category?: string;
  tags?: string[];
  variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "select";
  defaultValue?: unknown;
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: unknown }>;
}

export interface ExecutionHistory {
  items: ExecutionHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ExecutionHistoryItem {
  id: string;
  code: string;
  language: Language;
  timestamp: string;
  result: CodeExecutionResponse;
  sandboxId?: string;
  title?: string;
  favorite?: boolean;
  tags?: string[];
}

export interface ExecutionEnvironment {
  name: string;
  language: Language;
  version?: string;
  packages?: string[];
  environmentVariables?: Record<string, string>;
  workingDirectory?: string;
  timeout?: number;
  memoryLimit?: number;
  cpuLimit?: number;
}

export interface RuntimeCapabilities {
  supportedLanguages: Language[];
  maxExecutionTime: number;
  maxMemoryUsage: number;
  supportsFileSystem: boolean;
  supportsNetworking: boolean;
  supportsPackageInstallation: boolean;
  supportsInteractiveMode: boolean;
  supportsPersistentSessions: boolean;
}

// Form types for execution
export interface ExecutionFormValues {
  code: string;
  language: Language;
  mode: ExecutionMode;
  sandboxId?: string;
  saveToHistory: boolean;
  title?: string;
  template?: string;
}

export interface QuickExecutionOptions {
  language?: Language;
  template?: string;
  autoRun?: boolean;
  showResults?: boolean;
  saveToHistory?: boolean;
}

// Enhanced error types for better user experience
export interface StructuredPythonError {
  type: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stackTrace: StackFrame[];
  suggestions: string[];
  code: string;
  errorClass: string;
}

export interface ErrorParseResult {
  success: boolean;
  error?: StructuredPythonError;
  rawError?: string;
}

export interface ErrorParseOptions {
  includeStackTrace: boolean;
  includeSuggestions: boolean;
  maxStackFrames?: number;
}

// Result formatting and display
export interface ResultFormatter {
  format: (result: CodeExecutionResponse) => FormattedResult;
  supports: (artifact: ExecutionArtifact) => boolean;
}

export interface FormattedResult {
  type: "text" | "html" | "markdown" | "json" | "image" | "chart" | "table";
  content: string;
  title?: string;
  metadata?: Record<string, unknown>;
}
