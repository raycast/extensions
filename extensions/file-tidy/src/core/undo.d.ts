export interface UndoFailure {
  from: string;
  to: string;
  code: "missing" | "occupied" | "error";
  message?: string;
}
export interface UndoResult {
  time: string;
  sourceDir: string;
  manifestPath: string;
  restored: number;
  failures: UndoFailure[];
  removedDirs: string[];
  retired: boolean;
}
export interface TidyRun {
  time: string;
  sourceDir: string;
  manifestPath: string;
  moves: Array<{ from: string; to: string; action?: "archive" | "duplicate" | "review" }>;
  createdDirs: string[];
}
export function getLastRun(destDir: string): TidyRun | null;
export function undoRun(destDir: string, manifestPath: string): UndoResult | null;
export function undoLastRun(destDir: string): UndoResult | null;
