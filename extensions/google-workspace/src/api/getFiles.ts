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
  capabilities?: {
    canTrash: boolean;
  };
};

function getParams(queryType: QueryTypes, scope: ScopeTypes, queryText = "") {
  const params = new URLSearchParams();

  const escapedText = queryText.replace(/[\\']/g, "\\$&");

  if (queryType === QueryTypes.fileName) {
    params.append("q", `name contains '${escapedText}' and trashed = false`);
  } else if (queryType === QueryTypes.fullText) {
    params.append("q", `name contains '${escapedText}' or fullText contains '${escapedText}' and trashed = false`);
  } else if (queryType === QueryTypes.starred) {
    params.append("q", "starred and trashed = false");
  } else {
    params.append("q", "trashed = false");
  }

  params.append(
    "fields",
    "files(id, name, mimeType, webViewLink, webContentLink, size, modifiedTime, thumbnailLink, starred, capabilities(canTrash), parents)"
  );

  if (scope === ScopeTypes.allDrives) {
    params.append("corpora", "allDrives");
    params.append("supportsAllDrives", "true");
    params.append("includeItemsFromAllDrives", "true");
  }

  if (queryType === QueryTypes.fileName || queryType === QueryTypes.starred) {
    params.append("orderBy", "recency desc");
  }

  return params.toString();
}

export function getFilesURL(queryType: QueryTypes, scope: ScopeTypes, queryText = "") {
  return `https://www.googleapis.com/drive/v3/files?${getParams(queryType, scope, queryText)}`;
}

export function getStarredFilesURL() {
  return getFilesURL(QueryTypes.starred, ScopeTypes.allDrives);
}
