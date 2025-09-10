export interface ContentResult {
  success: boolean;
  content: string;
  error?: string;
  metadata?: {
    source: string;
    sourceType: "url" | "file";
    extractionTime?: number;
    contentLength?: number;
    title?: string;
    fileSize?: number;
    fileExtension?: string;
  };
}

export interface ProcessingOptions {
  format?: "text" | "json" | "xml";
  context?: string;
  source: string;
  sourceType: "url" | "file";
}

export interface ApiPreferences {
  openaiApiKey?: string;
  firecrawlApiKey?: string;
  jinaApiKey?: string;
}
