/**
 * Shared type definitions for the renaming extension
 *
 * Re-exports enums from ./enums for convenience.
 * All categorical types are defined as string enums in enums.ts.
 */

import {
  SelectionMode,
  CaseStyle,
  SortField,
  SortDirection,
  TemplateDateSource,
  ClipboardFormat,
  AISuggestionStatus,
  FileCategory,
  ErrorCode,
} from "./enums";

export {
  SelectionMode,
  CaseStyle,
  SortField,
  SortDirection,
  TemplateDateSource,
  ClipboardFormat,
  AISuggestionStatus,
  FileCategory,
  ErrorCode,
};

export interface FileInfo {
  readonly path: string;
  readonly name: string;
  readonly baseName: string;
  readonly extension: string;
  readonly isDirectory: boolean;
  readonly size?: number;
  readonly modified?: Date;
}

export interface RenameResult {
  readonly oldPath: string;
  readonly newPath: string;
  readonly success: boolean;
  readonly error?: string;
}

export interface RenameOperation {
  readonly oldPath: string;
  readonly newName: string;
  readonly newPath: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RenameHistoryEntry {
  readonly timestamp: number;
  readonly description: string;
  readonly operations: ReadonlyArray<{
    readonly oldPath: string;
    readonly newPath: string;
  }>;
}

export type DateFormat = "YYYY-MM-DD" | "YYYYMMDD" | "DD-MM-YYYY" | "MM-DD-YYYY" | "YYYY_MM_DD";

export interface NumberingOptions {
  startAt: number;
  increment: number;
  padding: number; // 0 = auto
}

// Template System Types

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface TransliterationOptions {
  enabled: boolean;
  removeAccents: boolean;
}

export interface CounterOptions {
  start: number;
  step: number;
  padding: number;
}

export interface NamingTemplate {
  id: string;
  name: string;
  description?: string;
  pattern: string; // e.g., "{date:YYYY-MM-DD}_{original}_{counter:001}"
  dateSource: TemplateDateSource;
  counter: CounterOptions;
  sort: SortOptions;
  transliteration: TransliterationOptions;
  caseStyle: CaseStyle;
  isBuiltIn: boolean;
}

// Template Parser Types

export type TemplateTokenType = "literal" | "variable";

export interface TemplateLiteralToken {
  type: "literal";
  value: string;
}

export interface TemplateVariableToken {
  type: "variable";
  name: string;
  format?: string;
  fullMatch: string;
}

export type TemplateToken = TemplateLiteralToken | TemplateVariableToken;

export interface ParsedTemplate {
  tokens: TemplateToken[];
  variables: string[];
  raw: string;
}

// Template Context - data available during variable resolution

export interface TemplateContext {
  file: FileInfo;
  index: number;
  total: number;
  metadata?: FileMetadataContext;
  dateSource: TemplateDateSource;
  counter: CounterOptions;
}

export interface FileMetadataContext {
  // Basic file stats
  size: number;
  created: Date;
  modified: Date;

  // EXIF data (for images)
  exif?: {
    dateTaken?: Date;
    width?: number;
    height?: number;
    camera?: string;
    cameraMake?: string;
    cameraModel?: string;
  };

  // Spotlight metadata (macOS)
  spotlight?: {
    duration?: number;
    artist?: string;
    album?: string;
    title?: string;
    pixelWidth?: number;
    pixelHeight?: number;
    pageCount?: number;
    audioChannelCount?: number;
    audioBitRate?: number;
  };
}

// Clipboard Rename Types

export interface ClipboardParseResult {
  names: string[];
  format: ClipboardFormat;
  hasExtensions: boolean;
}

export interface ClipboardMapping {
  file: FileInfo;
  newName: string;
  hasMatch: boolean;
}

// AI Suggestion Types

export interface AISuggestion {
  filePath: string;
  originalName: string;
  suggestedName: string;
  status: AISuggestionStatus;
  error?: string;
}

export interface AIPromptConfig {
  fileType: string;
  prompt: string;
  maxLength?: number;
}

// Grouped Rename Types

export interface ExtensionGroupConfig {
  extension: string;
  baseName: string;
  prefix?: string;
  suffix?: string;
  separator?: string;
  indexSeparator?: string;
  startNumber?: number;
  paddingDigits?: number;
  caseStyle?: CaseStyle;
}

export interface GroupedRenameGlobalConfig {
  separator: string;
  indexSeparator: string;
  startNumber: number;
  paddingDigits: number;
  caseStyle: CaseStyle;
  prefix: string;
  suffix: string;
}
