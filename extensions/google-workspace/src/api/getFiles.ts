export enum QueryTypes {
  fileName = "fileName",
  fileNameAllDrives = "fileNameAllDrives",
  fullText = "fullText",
  fullTextAllDrives = "fullTextAllDrives",
  starred = "starred",
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
  capabilities?: {
    canTrash: boolean;
  };
};

function getParams(queryType: QueryTypes, queryText = "") {
  const params = new URLSearchParams();

  const escapedText = queryText.replace(/[\\']/g, "\\$&");

  if (queryType === QueryTypes.fileName || queryType === QueryTypes.fileNameAllDrives) {
    params.append("q", `name contains '${escapedText}' and trashed = false`);
  } else if (queryType === QueryTypes.fullText || queryType === QueryTypes.fullTextAllDrives) {
    params.append("q", `name contains '${escapedText}' or fullText contains '${escapedText}' and trashed = false`);
  } else if (queryType === QueryTypes.starred) {
    params.append("q", "starred and trashed = false");
  } else {
    params.append("q", "trashed = false");
  }

  params.append(
    "fields",
    "files(id, name, mimeType, webViewLink, webContentLink, size, modifiedTime, thumbnailLink, starred, capabilities(canTrash))"
  );

  if (queryType === QueryTypes.fileNameAllDrives || queryType === QueryTypes.fullTextAllDrives) {
    params.append("supportsAllDrives", "true");
    params.append("includeItemsFromAllDrives", "true");
  }

  if (queryType === QueryTypes.fileName || queryType === QueryTypes.starred) {
    params.append("orderBy", "recency desc");
  }

  return params.toString();
}

export function getFilesURL(queryType: QueryTypes, queryText = "") {
  return `https://www.googleapis.com/drive/v3/files?${getParams(queryType, queryText)}`;
}

export function getStarredFilesURL() {
  return getFilesURL(QueryTypes.starred);
}
