export type Severity = "critical" | "high" | "medium" | "low";

export interface NewsItem {
  title: string;
  link: string;
  source: string; // feed display name
  publishedAt: number; // epoch ms; 0 if missing
  summary: string; // plain-text snippet, may be ""
  score: number;
  severity: Severity;
}
