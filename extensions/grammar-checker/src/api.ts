export interface CheckResult {
  corrected: string;
  issues: Issue[];
}

export interface Issue {
  type: string;
  severity: "error" | "warning" | "suggestion";
  original: string;
  correction: string;
  explanation: string;
}

export interface LLMProvider {
  analyzeText(text: string, style: string): Promise<CheckResult>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}
