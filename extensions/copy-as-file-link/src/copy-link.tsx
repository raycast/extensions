import { Clipboard, showToast, Toast, LaunchProps } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { pathToFileURL } from "node:url";

/**
 * Returns the POSIX paths of the items currently selected in Finder.
 * Returns an empty array if Finder has no selection.
 */
async function getFinderSelection(): Promise<string[]> {
  const script = `
tell application "Finder"
  try
    set sel to selection
    if (count of sel) is 0 then return ""
    set out to ""
    repeat with f in sel
      set out to out & (POSIX path of (f as alias)) & linefeed
    end repeat
    return out
  on error
    return ""
  end try
end tell`;
  const result = await runAppleScript(script);
  return result
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Converts a POSIX path into a proper file:/// URL with percent-encoding
 * for spaces and special characters.
 */
function toFileUrl(p: string): string {
  // Normalize trailing slash on directories so the URL matches Finder's form.
  return pathToFileURL(p).href;
}

type CopyArgs = {
  paths: string | undefined;
};

export default async function Command(props: LaunchProps<{ arguments: CopyArgs }>) {
  let paths: string[] = [];

  const argRaw = props.arguments?.paths?.trim();
  if (argRaw) {
    // Split on newlines; each line is a POSIX path. This handles paths
    // containing spaces (common on macOS) correctly. Whitespace-only
    // entries are filtered out.
    paths = argRaw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else {
    paths = await getFinderSelection();
  }

  if (paths.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No file selected",
      message: argRaw
        ? "No paths were provided as arguments."
        : "Select files or folders in Finder, then run this command.",
    });
    return;
  }

  const links = paths.map(toFileUrl);
  const text = links.join("\n");

  try {
    await Clipboard.copy(text);
    await showToast({
      style: Toast.Style.Success,
      title: paths.length === 1 ? "Copied file link" : `Copied ${paths.length} file links`,
      message: paths.length === 1 ? links[0] : "",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy",
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
