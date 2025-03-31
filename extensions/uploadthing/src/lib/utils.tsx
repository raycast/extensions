import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
  Color,
  Image,
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

export const getToken = () => {
  const { token } = getPreferenceValues<Preferences.UploadFiles>();

  // Our quick-copy button copies the full env var `UPLOADTHING_TOKEN='VALUE'`
  // To improve UX, allow this to be pasted to preferences and unwrap the actual value
  const withoutEnvWrapping = token.replace(
    /UPLOADTHING_TOKEN\s*=\s*['"]?(.*?)['"]?$/,
    "$1",
  );

  return withoutEnvWrapping;
};

export const getDecodedToken = () => {
  const token = getToken();
  return JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
};

export const getACLInfoForApp = async () => {
  const { apiKey } = getDecodedToken();

  const appInfo = await fetch("https://api.uploadthing.com/v7/getAppInfo", {
    method: "POST",
    headers: {
      "x-uploadthing-api-key": apiKey,
    },
  }).then(
    (r) => r.json() as Promise<{ defaultACL: ACL; allowACLOverride: boolean }>,
  );

  const secondaryACL: ACL | undefined = appInfo.allowACLOverride
    ? appInfo.defaultACL === "private"
      ? "public-read"
      : "private"
    : undefined;

  return { primary: appInfo.defaultACL, secondary: secondaryACL };
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
  const token = getToken();
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
  const utapi = new UTApi({ token: getToken() });

  return Promise.all(
    files.map(async (file) => {
      const { url } = await utapi.getSignedURL(file.key);
      return url;
    }),
  );
};

export const StatusIconMap: Record<string, Image.ImageLike> = {
  "Deletion Pending": { source: Icon.Document, tintColor: Color.Orange },
  Failed: { source: Icon.Document, tintColor: Color.Red },
  Uploaded: { source: Icon.Document, tintColor: Color.Green },
  Uploading: { source: Icon.Document, tintColor: Color.Blue },
};
