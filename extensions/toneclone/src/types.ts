export interface Persona {
  personaId: string;
  name: string;
  lastUsedAt: string;
  lastModifiedAt: string;
  status: string;
  trainingStatus: string;
  trainingJob?: Record<string, unknown>;
  personaType: string;
  smartStyle: boolean;
  color?: string; // Hex color from API
  isBuiltIn?: boolean; // Indicates if this is a built-in persona
}

export interface KnowledgeCard {
  knowledgeCardId: string;
  userId: string;
  name: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
  isEnabled: boolean;
  disabledAt?: string;
}

export interface QueryRequest {
  personaId: string;
  prompt: string;
  knowledgeCardId?: string;
  knowledgeCardIds?: string[];
  context?: string;
  parentUrl?: string;
  formality?: number;
  readingLevel?: number;
  length?: number;
  streaming?: boolean;
  document?: string;
}

export interface QueryResponse {
  content: string;
  personaId: string;
  prompt: string;
  knowledgeCardId?: string;
}

export interface QueryPreset {
  presetId: string;
  name: string;
  prompt: string;
  urlMatchExpressions?: string[];
  priority?: number;
}

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  fileType: string;
  size: number;
  createdAt: string;
  contentType: string;
  source: string;
}

export interface TextUploadRequest {
  content: string;
  filename: string;
  source: string;
}

export interface AssociateFilesRequest {
  fileIds: string[];
}

export interface APIError {
  error: string;
  message?: string;
}

export interface SavedPreferences {
  lastPersonaId?: string;
  lastKnowledgeCardIds?: string[];
  lastInputType?: "text" | "file";
  generatePersonaId?: string;
  trainPersonaId?: string;
  [key: string]: string | string[] | undefined;
}

export type FileSource = "raycast";

// Constants
export const FILE_SOURCE_RAYCAST: FileSource = "raycast";
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [".txt", ".doc", ".docx", ".pdf", ".md", ".rtf"];

export const DEFAULT_FORM_VALUES = {
  FORMALITY: 5,
  READING_LEVEL: 10,
  TARGET_LENGTH: 200,
} as const;
