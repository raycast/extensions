/**
 * Copy for the error codes core throws. Core carries data and codes only, so
 * every code added under src/core needs an entry here *and* in the CLI's
 * formatError — otherwise core's raw English leaks straight into the UI.
 */
interface CoreError extends Error {
  code?: string;
  configPath?: string;
  manifestPath?: string;
  path?: string;
  label?: string;
  segment?: string;
  destDir?: string;
  report?: string;
}

const REPORT_LABEL: Record<string, string> = {
  duplicates: "Duplicate details",
  similar: "Look-alike report",
};

export function describeError(err: unknown, fallbackTitle: string): { title: string; message: string } {
  const e = err as CoreError;
  const cause = (e?.cause as Error | undefined)?.message;
  switch (e?.code) {
    case "CONFIG_PARSE":
      return { title: "Invalid config file", message: `${e.configPath} could not be parsed: ${cause ?? ""}` };
    case "INVALID_SEGMENT":
      return {
        title: "Invalid folder name in config",
        message: `The ${e.label} name from your config is not a plain folder name: “${e.segment}”`,
      };
    case "TIDY_DIR_ESCAPES":
      return {
        title: "Unusable .tidy folder",
        message: `The .tidy folder in ${e.destDir} is a link pointing outside it, so its records can't be trusted`,
      };
    case "EXDEV_VERIFY":
      return {
        title: "Cross-volume copy failed",
        message: `Verification failed for ${e.path}, so the file was left where it was`,
      };
    case "MANIFEST_CORRUPT":
      return {
        title: "Invalid tidy record",
        message: `${e.manifestPath} is unusable, so this run can't be undone`,
      };
    // Not a failed run: this one only ever describes an append that happened
    // after every file had already moved.
    case "REPORT_WRITE":
      return {
        title: `${REPORT_LABEL[e.report ?? ""] ?? "Record"} not written`,
        message: `Every file was moved as planned; only ${e.path} could not be updated: ${cause ?? ""}`,
      };
    default:
      return { title: fallbackTitle, message: err instanceof Error ? err.message : String(err) };
  }
}
