export interface TextReplacement {
  uuid: string;
  trigger: string;
  replacementText: string;
  tags: string[];
  enabled: boolean;
}

export interface ReplacementInput {
  trigger: string;
  replacementText: string;
  tags: string[] | string;
}

export interface ReplacementMetadata {
  uuid: string;
  tags: string[];
}

export type MetadataByTrigger = Record<string, ReplacementMetadata>;

export interface SystemReplacementItem {
  replace: string;
  with: string;
  on?: number | boolean | string;
}

export interface ImportResult {
  accepted: TextReplacement[];
  skipped: string[];
}

export class ReplacementImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplacementImportError";
  }
}
