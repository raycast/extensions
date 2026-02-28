import Path from "node:path";
import { ReactElement } from "react";

import { Icon, Action } from "@raycast/api";

/**
 * Open file action. Checks if the entry has a file field, and if so, creates an Action.Open that opens the file. The path to the file is constructed by joining the provided path with the file name from the entry.
 * @param { { file?: string }, string } { entry, path } - An object containing the entry and the path. The entry is expected to have an optional file field, and the path is a string representing the directory where the file is located.
 * @returns { JSX.Element | null } - Returns an Action.Open component if the entry has a file field, otherwise returns null.
 */
export const OpenFileAction = ({ entry, path }: { entry: { file?: string }; path: string }): ReactElement | null => {
  if (entry.file) {
    return <Action.Open title="Open" target={entry.file ? Path.join(path, entry.file) : ""} />;
  }
  return null;
};

/**
 * Opens the URL in the default browser if the entry has a url field. It uses the Action.OpenInBrowser component from Raycast API, with the icon set to Icon.Globe and the title set to "Open URL". If the entry does not have a url field, it returns null.
 * @param { { url?: string } } { entry } - An object containing the entry. The entry is expected to have an optional url field, which is a string representing the URL to be opened in the browser.
 * @returns { JSX.Element | null } - Returns an Action.OpenInBrowser component if the entry has a url field, otherwise returns null.
 */
export const OpenInBrowserAction = ({ entry }: { entry: { url?: string } }): ReactElement | null => {
  if (entry.url) {
    return <Action.OpenInBrowser icon={Icon.Globe} title="Open URL" url={entry.url} />;
  }
  return null;
};
