import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";
import { ACL } from "@uploadthing/shared";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { UTApi, UTFile } from "uploadthing/server";

export const ACLTitleMap: Record<ACL, string> = {
  private: "Private",
  "public-read": "Public",
};

export const getPreferredACL = () => {
  const preferences = getPreferenceValues<Preferences.UploadFromClipboard>();
  const secondaryACL: ACL =
    preferences.acl === "public-read" ? "private" : "public-read";

  return { primary: preferences.acl, secondary: secondaryACL };
};

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
  const { token } = getPreferenceValues<Preferences.UploadFiles>();
  try {
    new UTApi({ token });
  } catch (err) {
    const markdown =
      `## ${err instanceof Error ? err.message : "Invalid token"}` +
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

export const getSignedUrls = async (files: { key: string }[]) => {
  const { token } = getPreferenceValues<Preferences.UploadFiles>();
  const utapi = new UTApi({ token });

  return Promise.all(
    files.map(async (file) => {
      const { url } = await utapi.getSignedURL(file.key);
      return url;
    }),
  );
};
