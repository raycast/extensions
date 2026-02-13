/**
 * Enumerated types for the renaming extension
 *
 * All categorical types are defined here as string enums for type safety
 * and runtime access. These replace scattered string union types.
 */

export enum SortField {
  NONE = "none",
  NAME = "name",
  DATE_CREATED = "date_created",
  DATE_MODIFIED = "date_modified",
  DATE_TAKEN = "date_taken",
  SIZE = "size",
}

export enum SortDirection {
  ASC = "asc",
  DESC = "desc",
}

export enum CaseStyle {
  UNCHANGED = "unchanged",
  UPPERCASE = "uppercase",
  LOWERCASE = "lowercase",
  TITLE_CASE = "titleCase",
  SENTENCE_CASE = "sentenceCase",
  CAMEL_CASE = "camelCase",
  PASCAL_CASE = "pascalCase",
  SNAKE_CASE = "snakeCase",
  KEBAB_CASE = "kebabCase",
}

export enum FileCategory {
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
  SPREADSHEET = "spreadsheet",
  PRESENTATION = "presentation",
  ARCHIVE = "archive",
  CODE = "code",
  TEXT = "text",
  FONT = "font",
  EXECUTABLE = "executable",
  DATA = "data",
}

export enum TemplateDateSource {
  NOW = "now",
  CREATED = "created",
  MODIFIED = "modified",
  EXIF = "exif",
}

export enum SelectionMode {
  FILES = "files",
  FOLDERS = "folders",
  ALL = "all",
}

export enum ClipboardFormat {
  NEWLINE = "newline",
  TAB = "tab",
  COMMA = "comma",
}

export enum AISuggestionStatus {
  PENDING = "pending",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export enum ErrorCode {
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  CONFLICT = "CONFLICT",
  VALIDATION = "VALIDATION",
  PATH_TRAVERSAL = "PATH_TRAVERSAL",
}
