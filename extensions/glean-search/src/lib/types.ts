export interface GleanSnippet {
  mimeType: string;
  text: string;
}

export interface GleanDocument {
  datasource: string;
  docType: string;
  metadata: Record<string, unknown>;
  title: string;
  url: string;
}

export interface GleanResult {
  title: string;
  url: string;
  document: GleanDocument;
  snippets: GleanSnippet[];
}

export interface GleanSearchResponse {
  cursor?: string;
  hasMoreResults: boolean;
  requestID: string;
  results: GleanResult[];
}

export type AuthState = "authenticated" | "unauthenticated" | "checking" | "error";

export interface AuthInfo {
  state: AuthState;
  user?: string;
  host?: string;
  error?: string;
}
