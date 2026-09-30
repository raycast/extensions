import type { SourceFile } from "./scan.js";

export interface HealthIssue {
  issue: "empty" | "corrupt" | "junk";
  detail?: string;
}
export function checkHealth(files: SourceFile[]): Map<string, HealthIssue>;
export function isJunk(name: string): boolean;
