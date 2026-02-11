import { DropboxResponseError } from "dropbox";
import { Error as DropboxError, files } from "dropbox/types/dropbox_types";
import { getDropboxClient, provider } from "./oauth";
import { getPreferenceValues, openExtensionPreferences, popToRoot, showInFinder, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { writeFile } from "fs/promises";

export interface ListFileResp {
  entries: Array<files.FileMetadataReference | files.FolderMetadataReference>;
  cursor: string;
  has_more: boolean;
}

export async function dbxListAnyFiles(req: { path: string; query: string; cursor: string }): Promise<ListFileResp> {
  try {
    if (req.cursor) {
      if (req.query) {
        return await dbxSearchFilesContinue(req.cursor);
      }
      return await dbxListFilesContinue(req.cursor);
    } else {
      if (req.query) {
        // EDGE CASE: searching for ' ' (space) causes 400 Error
        if (req.query === " ")
          return {
            entries: [],
            cursor: "",
            has_more: false,
          };
        return await dbxSearchFiles(req.query === " " ? "" : req.query);
      }
      return await dbxListFiles(req.path);
    }
  } catch (e) {
    throw new Error(convertError(e));
  }
}

export async function dbxListFiles(path: string): Promise<ListFileResp> {
  const dbx = getDropboxClient();
  const resp = await dbx.filesListFolder({
    path: path,
    include_deleted: false,
  });
  return {
    entries: resp.result.entries as Array<files.FileMetadataReference | files.FolderMetadataReference>,
    cursor: resp.result.cursor,
    has_more: resp.result.has_more,
  };
}

export async function dbxListFilesContinue(cursor: string): Promise<ListFileResp> {
  const dbx = getDropboxClient();
  const resp = await dbx.filesListFolderContinue({
    cursor: cursor,
  });
  return {
    entries: resp.result.entries as Array<files.FileMetadataReference | files.FolderMetadataReference>,
    cursor: resp.result.cursor,
    has_more: resp.result.has_more,
  };
}

export async function dbxSearchFiles(query: string): Promise<ListFileResp> {
  const dbx = getDropboxClient();
  const resp = await dbx.filesSearchV2({
    query: query,
    include_highlights: false,
  });
  return convertSearchResult(resp.result);
}

export async function dbxSearchFilesContinue(cursor: string): Promise<ListFileResp> {
  const dbx = getDropboxClient();
  const resp = await dbx.filesSearchContinueV2({
    cursor: cursor,
  });
  return convertSearchResult(resp.result);
}

function convertSearchResult(res: files.SearchV2Result): ListFileResp {
  const entries = res.matches
    .filter((v) => {
      return v.metadata[".tag"] === "metadata";
    })
    .map((v) => {
      const md = v.metadata as files.MetadataV2Metadata;
      return md.metadata;
    });
  return {
    entries: entries as Array<files.FileMetadataReference | files.FolderMetadataReference>,
    cursor: res.cursor || "",
    has_more: res.has_more,
  };
}

export function getDirectoryViewURL(path: string) {
  return `https://www.dropbox.com/home${path}`;
}

export function getFilePreviewURL(path: string): string {
  return `https://www.dropbox.com/preview${path}`;
}

function convertError(err: unknown): string {
  const e = err as DropboxResponseError<string | DropboxError<{ ".tag"?: string }>> | Error;
  if ("error" in e) {
    if (typeof e.error === "string") return e.error;
    if (e.error.error[".tag"]) return e.error.error[".tag"];
  }
  if (e instanceof Error) return e.message;
  return `${e}`;
}

export async function downloadFile(name: string, path: string) {
  const { download_directory } = getPreferenceValues<Preferences>();
  const toast = await showToast(Toast.Style.Animated, "Downloading", name);

  if (!download_directory) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download directory not set";
    toast.message = "Please set the download directory in the extension preferences";
    toast.primaryAction = {
      title: "Open Extension Preferences",
      onAction: openExtensionPreferences,
    };
    return;
  }

  const dbx = getDropboxClient();
  try {
    const res = await dbx.filesDownload({ path });
    const result = res.result as files.FileMetadata & { fileBinary: Buffer };
    const file = join(download_directory, result.name);
    const binary = result.fileBinary;
    await writeFile(file, binary, "binary");
    toast.style = Toast.Style.Success;
    toast.title = "Downloaded";
    toast.primaryAction = {
      title: "Show in Finder",
      async onAction() {
        await showInFinder(file);
      },
    };
  } catch (error) {
    const message = convertError(error);
    toast.style = Toast.Style.Failure;
    toast.title = "Could not download";
    toast.message = message;
    if (message.includes("scope")) {
      toast.message = "Please re-authorize to be able to download";
      toast.primaryAction = {
        title: "Re-authorize",
        async onAction() {
          await provider.client.removeTokens();
          await provider.authorize();
          await popToRoot();
        },
      };
    }
  }
}
