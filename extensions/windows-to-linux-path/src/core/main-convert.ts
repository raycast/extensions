import { Clipboard, showToast, Toast } from "@raycast/api";

/**
 * Main function to convert a Windows path into a Linux one.
 * @param path Windows path
 * @param prefix Prefix for the path
 * @returns A Linux type path
 */
export default async function convertPath(path: string, prefix: string = "/") {
  // Condition to test if a path is a Windows type path
  if (!/^[A-Za-z]:\\/.test(path)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Path not valid",
    });
    return;
  }

  // Replace backslashes with forward slashes
  const slashed = path.replace(/\\/gi, "/");

  // Add prefix, lowercase the drive letter, and remove the ":"
  const converted = prefix + slashed.substring(0, 1).toLowerCase() + slashed.substring(2);

  await Clipboard.copy(converted);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied to clipboard",
    message: converted,
  });
}
