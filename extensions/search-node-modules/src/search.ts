import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import { Items } from "./types";

export async function search(setItems: (items: Items[]) => void, setLoading: (loading: boolean) => void) {
  try {
    setLoading(true);
    const { customDirectory } = getPreferenceValues<Preferences>();

    await showToast({
      style: Toast.Style.Animated,
      title: "Searching 'node_modules' folders",
    });

    const res = await runAppleScript(
      `
      -- AppleScript to list 'node_modules' folders, their sizes, and last modified times
      on run argv

      set targetDir to item 1 of argv

      -- Find all 'node_modules' directories using shell command
      set targetDirPOSIX to POSIX path of targetDir
      set findCommand to "find " & quoted form of targetDirPOSIX & " -type d -name 'node_modules' -prune -not -path '*/.*' 2>/dev/null | grep -vE '/(Applications|Library)/'"

      -- Get the paths of 'node_modules' directories
      set nodeModulesPaths to paragraphs of (do shell script findCommand)

      -- Check if any 'node_modules' folders were found
      if (count of nodeModulesPaths) is 0 then
      display dialog "No 'node_modules' folders found in '" & targetDir & "'." buttons {"OK"} default button "OK"
      return
      end if

      -- Prepare the results
      set resultList to ""

      repeat with nodeModulePath in nodeModulesPaths
      set sizeCommand to "du -sm " & quoted form of nodeModulePath & " | awk '{print $1}'"
      set sizeOut to do shell script sizeCommand

      set modifiedTimeCommand to "stat -f '%Sm' " & quoted form of nodeModulePath
      set modifiedTime to do shell script modifiedTimeCommand

      set resultList to resultList & nodeModulePath & " - " & sizeOut & " - " & modifiedTime & "\n"
      end repeat

      -- Return the resultList
      return resultList
      
      end run
    `,
      [customDirectory],
      {
        humanReadableOutput: true,
        language: "AppleScript",
        timeout: 60 * 1000,
      },
    );

    await showToast({
      style: Toast.Style.Success,
      title: "Successfully searched 'node_modules' folders",
    });

    const formattedRes = res
      .trim()
      .split("\n")
      .filter((line) => !line.startsWith("Skipped dangerous path:"))
      .map((line) => {
        const [path, size, lastModified] = line.split(" - ");
        return {
          id: path,
          title: path.replace(customDirectory, ""),
          size: Number(size),
          lastModified: new Date(lastModified),
        };
      });

    setItems(formattedRes);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to search 'node_modules' folders",
    });
  } finally {
    setLoading(false);
  }
}
