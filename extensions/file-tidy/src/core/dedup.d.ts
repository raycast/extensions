import type { SourceFile } from "./scan.js";

export interface DupInfo {
  keeper: { path: string; name: string };
  hash: string;
}
export function findDuplicates(sourceFiles: SourceFile[], destFiles: SourceFile[]): Promise<Map<string, DupInfo>>;
