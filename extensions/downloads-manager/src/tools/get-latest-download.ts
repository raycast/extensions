import { getLatestDownload, hasAccessToDownloadsFolder } from "../utils";

export default async function tool() {
  if (!hasAccessToDownloadsFolder()) {
    throw new Error("No permission to access the downloads folder");
  }

  const download = getLatestDownload();
  if (!download) {
    throw new Error("No downloads found");
  }

  return download.path;
}
