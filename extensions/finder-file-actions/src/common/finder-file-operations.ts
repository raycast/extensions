import { runAppleScript } from "run-applescript";

export type FinderFileOperation = "move" | "copy";

export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildFinderFileOperationScript(
  operation: FinderFileOperation,
  sourcePaths: string[],
  destinationPath: string,
  replacing: boolean,
): string {
  if (sourcePaths.length === 0) {
    throw new Error("No source files provided");
  }

  const sources = sourcePaths
    .map((sourcePath) => `(POSIX file "${escapeAppleScriptString(sourcePath)}") as alias`)
    .join(", ");
  const command = operation === "move" ? "move" : "duplicate";

  return `
    set sourceItems to {${sources}}
    set destinationFolder to (POSIX file "${escapeAppleScriptString(destinationPath)}") as alias
    tell application "Finder"
      ${command} sourceItems to destinationFolder replacing ${replacing}
    end tell
  `;
}

export async function performFinderFileOperation(
  operation: FinderFileOperation,
  sourcePaths: string[],
  destinationPath: string,
  replacing: boolean,
): Promise<void> {
  await runAppleScript(buildFinderFileOperationScript(operation, sourcePaths, destinationPath, replacing));
}
