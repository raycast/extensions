import { showHUD } from "@raycast/api";
import { previewFile } from "swift:../swift/motion-preview";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ensureRuntimes } from "./runtimes";

const execFileAsync = promisify(execFile);

const SUPPORTED_FILE = /\.(lottie|json|riv)$/i;

// Returns the POSIX path of the first Finder selection, or "" when nothing is selected or Finder isn't running.
const FINDER_SELECTION_SCRIPT = `
if application "Finder" is not running then
    return ""
end if

tell application "Finder"
    set sel to selection
    if sel is {} then return ""
    return POSIX path of (item 1 of sel as alias)
end tell
`;

// Reads the first selected Finder item via osascript — measurably faster here than Raycast's getSelectedFinderItems().
const getFinderSelection = async (): Promise<string | undefined> => {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", FINDER_SELECTION_SCRIPT]);
    const path = stdout.trim();
    return path ? path : undefined;
  } catch {
    return undefined;
  }
};

// Validates the Finder selection, then hands it to the Swift previewer (which reads and validates the file itself).
const PreviewAnimation = async () => {
  const file = await getFinderSelection();

  if (!file) {
    await showHUD("No file selected");
    return;
  }

  if (!SUPPORTED_FILE.test(file)) {
    await showHUD("Unsupported file format");
    return;
  }

  let libRoot: string;
  try {
    // The render runtimes aren't bundled — they're fetched once and cached. After
    // the first run this is a no-op; only the first run (or a version bump) downloads.
    libRoot = await ensureRuntimes();
  } catch {
    await showHUD("Could not download preview runtime — check your connection");
    return;
  }

  try {
    await previewFile(file, libRoot);
  } catch (error) {
    await showHUD(swiftErrorMessage(error) ?? "Could not preview animation");
  }
};

// Extracts a readable message from a Swift-bridge error (its stderr or message).
const swiftErrorMessage = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const { stderr, message } = error as { stderr?: unknown; message?: unknown };
  if (typeof stderr === "string") {
    const line = stderr
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);
    if (line) return line;
  }
  return typeof message === "string" && message.trim() ? message.trim() : undefined;
};

export default PreviewAnimation;
