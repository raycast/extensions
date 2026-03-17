import { Clipboard, showToast, Toast } from "@raycast/api";

/**
 * Main function to convert a Windows path into a Linux one.
 * @param path Windows path
 * @param prefix Prefix for the path
 * @returns A Linux type path
 */
export default async function convertPath(path: string, prefix: string = "/") {
  // Condition to test if a path is a Windows type path
  if (/^[A-Za-z]:\\/.test(path) != true) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Path not valid",
    });
    return;
  }

  // Replace backslashes to slashes
  const REGEX = /\\/gi;
  path = path.replace(REGEX, "/");

  // Add a slash at the beginning, then lower case the first character, and remove the ":"
  path = prefix + path.substring(0, 1).toLowerCase() + path.substring(2);

  await Clipboard.copy(path);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to clipboard",
    message: path,
  });
}
