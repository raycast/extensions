import { runAppleScript } from "run-applescript";
import { MeetError } from "../errors";

// AppleScript's `text item delimiters` can join a list into a single string
// with an arbitrary separator. A URL can legally contain a comma, but it can
// never contain a raw ASCII Unit Separator control character, so joining
// candidate lists with it (instead of ",") and splitting on it here is safe
// without needing to hand-build JSON inside AppleScript.
export const CANDIDATE_DELIMITER = "\u001f";

const PERMISSION_ERROR_PATTERNS = [
  /not authoris?ed to send apple events/i,
  /not allowed to send apple events/i,
  /-1743/,
];

const ACCESSIBILITY_ERROR_PATTERNS = [/not allowed to send keystrokes/i, /assistive access/i, /-25211/];

function classifyAppleScriptError(error: unknown): MeetError {
  const message = error instanceof Error ? error.message : String(error);

  if (ACCESSIBILITY_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return new MeetError("URL_READ_PERMISSION_DENIED", {
      message: "Raycast isn't allowed to send keystrokes to this browser.",
      recovery: "Grant Raycast Accessibility permission in System Settings → Privacy & Security → Accessibility.",
      cause: error,
    });
  }

  if (PERMISSION_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return new MeetError("URL_READ_PERMISSION_DENIED", {
      message: "Raycast isn't allowed to control this browser.",
      recovery:
        "Grant Raycast Automation permission for the browser in System Settings → Privacy & Security → Automation.",
      cause: error,
    });
  }

  return new MeetError("URL_READ_FAILED", { cause: error });
}

/**
 * Runs an AppleScript and throws a typed {@link MeetError} on failure instead
 * of letting a raw, unreadable osascript error surface to the user.
 */
export async function runAppleScriptSafe(script: string): Promise<string> {
  try {
    return await runAppleScript(script);
  } catch (error) {
    throw classifyAppleScriptError(error);
  }
}

/**
 * Runs an AppleScript expected to return a delimiter-joined list of
 * candidate URLs (see {@link CANDIDATE_DELIMITER}) and parses it back into
 * an array, dropping empty entries.
 */
export async function runCandidateScript(script: string): Promise<string[]> {
  const output = await runAppleScriptSafe(script);
  return output
    .split(CANDIDATE_DELIMITER)
    .map((candidate) => candidate.trim())
    .filter((candidate) => candidate.length > 0);
}
