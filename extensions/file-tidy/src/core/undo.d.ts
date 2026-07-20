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
export function undoLastRun(destDir: string): UndoResult | null;
