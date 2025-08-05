import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { getOAuthToken } from "./googleAuth";

export enum QueryTypes {
  fileName = "fileName",
  fullText = "fullText",
  starred = "starred",
}

export enum ScopeTypes {
  user = "user",
  allDrives = "allDrives",
}

export type File = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  size?: string;
  modifiedTime: string;
  starred: boolean;
  parents?: string[];
  filePath?: string;
  capabilities?: {
    canTrash: boolean;
  };
};

type FileData = {
  id: string;
  name: string;
  parents: string[];
};

// For the whole list of properties, look at: https://developers.google.com/drive/api/reference/rest/v3/files

const EXTENSION_SEARCH_PARAMS =
  "files(id, name, mimeType, webViewLink, webContentLink, size, modifiedTime, thumbnailLink, starred, capabilities(canTrash), parents)";

const AI_EXTENSION_SEARCH_PARAMS =
  "files(id, name, mimeType, webViewLink, webContentLink, size, modifiedTime, thumbnailLink, starred, capabilities(canTrash), parents, " +
  // Additional fields useful for AI analysis:
  "description, fileExtension, fullFileExtension, contentHints/indexableText, " +
  "createdTime, modifiedTime, modifiedByMeTime, viewedByMeTime, sharedWithMeTime, " +
  "lastModifyingUser(displayName,emailAddress), " +
  "owners(displayName,emailAddress), " +
  "shared, viewersCanCopyContent, " +
  "spaces, folderColorRgb, " +
  "trashed, explicitlyTrashed, trashedTime, " +
  "properties, appProperties, " +
  "imageMediaMetadata(width,height,cameraMake,cameraModel,location,time,rotation), " +
  "videoMediaMetadata(width,height,durationMillis), " +
  "shortcutDetails(targetId,targetMimeType), " +
  "quotaBytesUsed, version, originalFilename, " +
  "exportLinks, iconLink, hasThumbnail)";

interface BaseGetFilesParams {
  scope: ScopeTypes;
  useAIParams?: boolean;
}

interface StandardGetFilesParams extends BaseGetFilesParams {
  queryType: QueryTypes;
  queryText?: string;
}

interface AIGetFilesParams extends BaseGetFilesParams {
  query: string;
}

function getSearchParams({ scope, useAIParams = false, ...params }: StandardGetFilesParams | AIGetFilesParams) {
  const urlParams = new URLSearchParams();

  // Build the query string
  if ("queryType" in params) {
    const escapedText = params.queryText?.replace(/[\\']/g, "\\$&") ?? "";

    if (params.queryType === QueryTypes.fileName) {
      urlParams.append("q", `name contains '${escapedText}' and trashed = false`);
    } else if (params.queryType === QueryTypes.fullText) {
      urlParams.append("q", `name contains '${escapedText}' or fullText contains '${escapedText}' and trashed = false`);
    } else if (params.queryType === QueryTypes.starred) {
      urlParams.append("q", "starred and trashed = false");
    } else {
      urlParams.append("q", "trashed = false");
    }

    // Add sorting for specific query types
    if (params.queryType === QueryTypes.fileName || params.queryType === QueryTypes.starred) {
      urlParams.append("orderBy", "recency desc");
    }
  } else {
    urlParams.append("q", `${params.query} and trashed = false`);
  }

  // Common parameters
  urlParams.append("fields", useAIParams ? AI_EXTENSION_SEARCH_PARAMS : EXTENSION_SEARCH_PARAMS);

  if (scope === ScopeTypes.allDrives) {
    urlParams.append("corpora", "allDrives");
    urlParams.append("supportsAllDrives", "true");
    urlParams.append("includeItemsFromAllDrives", "true");
  }

  return urlParams.toString();
}

async function baseGetFiles(params: StandardGetFilesParams | AIGetFilesParams) {
  const url = `https://www.googleapis.com/drive/v3/files?${getSearchParams(params)}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOAuthToken()}`,
    },
  });
  const data = (await response.json()) as { files: File[] };

  const { displayFilePath } = getPreferenceValues<Preferences>();
  if (displayFilePath) {
    await Promise.all(
      data.files.map(async (file) => {
        file.filePath = await getFilePath(file.id);
      }),
    );
  }

  return data;
}

// Standard search using predefined query types
export async function getFiles(params: StandardGetFilesParams) {
  return baseGetFiles(params);
}

async function getFilePath(fileId: string): Promise<string> {
  const getFileParents = async (fileId: string) => {
    const getFileUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,parents`;
    const response = await fetch(getFileUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getOAuthToken()}`,
      },
    });

    return await response.json();
  };

  const getParentPath = async (fileId: string): Promise<string> => {
    const fileData = (await getFileParents(fileId)) as FileData;

    if (!fileData.parents || fileData.parents.length === 0) {
      return fileData.name;
    }

    const parentId = fileData.parents[0];
    const parentPath = await getParentPath(parentId);

    return `${parentPath}/${fileData.name}`;
  };

  return await getParentPath(fileId);
}

export function getStarredFiles() {
  return getFiles({ queryType: QueryTypes.starred, scope: ScopeTypes.allDrives });
}

// Advanced search with extended metadata for AI operations
export async function getFilesForAI(params: AIGetFilesParams) {
  return baseGetFiles({
    ...params,
    useAIParams: true,
  });
}
