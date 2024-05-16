import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { UTApi, UTFile } from "uploadthing/server";

/**
 * Read history of files from clipboard
 * Stop when the first clipboard item is not a file
 */
export const readFilesFromClipboard = async () => {
  const files: string[] = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cb = await Clipboard.read({ offset });
    if (!cb.file) break;
    files.push(cb.file);
    offset++;
  }
  return files;
};

export const filePathsToFile = async (filePaths: string[]) => {
  const files = await Promise.all(
    filePaths.map(async (file) => {
      const filepath = file.startsWith("file://") ? fileURLToPath(file) : file;
      const filename = basename(filepath);
      const buf = await readFile(filepath);
      return new UTFile([buf], filename);
    }),
  );
  return files;
};

export const guardInvalidApiKey = () => {
  const { apiKey } = getPreferenceValues<Preferences.UploadFiles>();
  try {
    new UTApi({ apiKey });
  } catch (err) {
    const markdown =
      `## ${err instanceof Error ? err.message : "API key incorrect"}` +
      "\nPlease update it in command preferences and try again.";

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  }
};
