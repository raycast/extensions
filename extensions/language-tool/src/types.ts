// Types for LanguageTool API
// Based on official Swagger 2.0

export interface Language {
  /** Language name like 'French' or 'English (Australia)' */
  name: string;
  /** Language code like 'en' */
  code: string;
  /** Complete language code like 'en-US' or 'ca-ES-valencia' */
  longCode: string;
}

export interface CheckTextResponse {
  software?: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    status?: string;
    premium?: boolean;
  };
  language?: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
    };
  };
  matches?: Match[];
}

export interface Match {
  /** Error message displayed to the user */
  message: string;
  /** Optional shorter version of the message */
  shortMessage?: string;
  /** 0-based offset of the error in the text */
  offset: number;
  /** Length of the error in characters */
  length: number;
  /** Replacements that can fix the error */
  replacements: Replacement[];
  /** Error context */
  context: {
    text: string;
    offset: number;
    length: number;
  };
  /** The sentence where the error occurred */
  sentence: string;
  rule?: {
    id: string;
    subId?: string;
    description: string;
    urls?: Array<{ value?: string }>;
    issueType?: string;
    category: {
      id?: string;
      name?: string;
    };
  };
}

export interface Replacement {
  value?: string;
}
