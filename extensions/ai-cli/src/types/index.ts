import type { Form } from "@raycast/api";
import { TEMPLATE_TYPES, TONE_TYPES } from "@/constants";

// Core Business Types

export type TemplateType = (typeof TEMPLATE_TYPES)[keyof typeof TEMPLATE_TYPES];
export type ToneType = (typeof TONE_TYPES)[keyof typeof TONE_TYPES];
export type ModelType = string; // Now just a string since models are dynamic per agent

export interface FormValues extends Form.Values {
  selectedAgent: string;
  template: TemplateType;
  tone: ToneType;
  model: ModelType;
  textInput: string;
  additionalContext: string;
  targetFolder: string;
}

/**
 * Parameters required for agent processing
 */
export interface AgentProcessingParams {
  values: FormValues;
  inputText: string;
}

export interface ExtensionPreferences {
  selectedAgent: string;
  // Claude preferences
  claudePath: string;
  claudeToken: string;
  // OpenAI preferences
  codexPath: string;
  codexToken: string;
  // Gemini preferences
  geminiPath: string;
  geminiToken: string;
  // Cursor preferences
  cursorPath: string;
  cursorToken: string;
  // Shared preferences
  agentWorkingDir: string;
  shellPath: string;
}

export interface FormattingVariant {
  id: string;
  content: string;
  index: number;
  originalInput?: string;
  originalPrompt?: string;
  error?: CategorizedError;
}

// Entity Management Types

export interface BaseCustomEntity {
  id: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomEntityInput<T extends BaseCustomEntity> = Omit<T, keyof BaseCustomEntity>;
export type CustomEntityUpdate<T extends BaseCustomEntity> = Partial<CustomEntityInput<T>>;

export interface ToneConfig {
  name: string;
  guidelines: string;
  icon?: string;
}

// Error Handling Types

export type ErrorCategory =
  | "timeout"
  | "not_found"
  | "permission"
  | "authentication"
  | "parsing"
  | "unknown"
  | "network"
  | "configuration";

export interface CategorizedError {
  category: ErrorCategory;
  title: string;
  message: string;
  originalMessage: string;
  recoverable: boolean;
  suggestions?: string[];
}

// Utility Types

export type ValidatedInput<T> = T;

// Validation Types
export interface ValidationResult<T> {
  isValid: boolean;
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  timestamp?: string; // For test compatibility
}

export type { PromptTemplate, PromptBuildParams } from "./prompt-template";
