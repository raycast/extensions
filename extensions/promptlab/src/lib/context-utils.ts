import { getPreferenceValues } from "@raycast/api";
import { ExtensionPreferences } from "./preferences/types";
import { runAppleScript } from "@raycast/utils";

/**
 * Removes extraneous symbols from a string and limits it to (by default) 3000 characters.
 *
 * @param str The string to filter.
 * @param cutoff The length to limit the string to, defaults to 3000.
 * @returns The filtered string.
 */
export const filterString = (str: string, cutoff?: number): string => {
  /* Removes unnecessary/invalid characters from strings. */
  const preferences = getPreferenceValues<ExtensionPreferences>();
  if (preferences.condenseAmount == "high") {
    // Remove some useful characters for the sake of brevity
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-'()/[\]{}@: ~\n\r<>]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || str.length);
  } else if (preferences.condenseAmount == "medium") {
    // Remove uncommon characters
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-'()/[\]{}@: ~\n\r<>+*&|]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || str.length);
  } else if (preferences.condenseAmount == "low") {
    // Remove all characters except for letters, numbers, and punctuation
    return str
      .replaceAll(/[^A-Za-z0-9,.?!\-'()/[\]{}@:; ~\n\r\t<>%^$~+*_&|]/g, "")
      .replaceAll('"', "'")
      .substring(0, cutoff || str.length);
  } else {
    // Just remove quotes and cut off at the limit
    return str.replaceAll('"', "'").substring(0, cutoff || str.length);
  }
};

/**
 * Gets the application that owns the menubar.
 * @param includePaths Whether to include the path of the application.
 * @returns A promise resolving to the name of the application as a string, or an object containing the name and path if includePaths is true.
 */
export const getMenubarOwningApplication = async (
  includePaths?: boolean,
): Promise<string | { name: string; path: string }> => {
  const app = await runAppleScript(`use framework "Foundation"
  use scripting additions
  set workspace to current application's NSWorkspace's sharedWorkspace()
  set runningApps to workspace's runningApplications()
  
  set targetApp to missing value
  repeat with theApp in runningApps
    if theApp's ownsMenuBar() then
      set targetApp to theApp
      exit repeat
    end if
  end repeat
  
  if targetApp is missing value then
    return ""
  else
    ${
      includePaths
        ? `return {targetApp's localizedName() as text, targetApp's bundleURL()'s fileSystemRepresentation() as text}`
        : `return targetApp's localizedName() as text`
    }
  end if`);

  if (includePaths) {
    const data = app.split(", ");
    return { name: data[0], path: data[1] };
  }
  return app;
};
