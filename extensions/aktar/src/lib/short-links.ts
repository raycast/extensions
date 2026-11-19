import type { ShortLinkMoveStatus, Upload } from "../api/types";

/** The link to share: the upload's short link when it has one, as Aktar's QR codes and copy formats do. */
export function shareLink(upload: Pick<Upload, "url" | "shortUrl">) {
  return upload.shortUrl || upload.url;
}

/**
 * A note for uploads whose short link couldn't be made, or undefined. The
 * uploads themselves worked, and their original links were copied instead.
 */
export function shortLinkWarning(uploads: Upload[]) {
  const failed = uploads.filter((upload) => upload.shortLinkError);
  if (failed.length === 0) return undefined;
  const reason = failed[0].shortLinkError;
  if (uploads.length === 1) return `Couldn't make a short link, so the original link was copied: ${reason}`;
  return `${failed.length} ${failed.length === 1 ? "file has" : "files have"} no short link, so their original links were copied: ${reason}`;
}

/** What a move did to the file's short link, for the toast; undefined when it had none or nothing went wrong. */
export function moveStatusNote(status: ShortLinkMoveStatus) {
  switch (status) {
    case "updated":
      return { warning: false, message: "Its short link now points to the new key" };
    case "orphaned":
      return {
        warning: true,
        message: "Its short link still points to the old key, which no longer exists. Make a new one in Search Uploads",
      };
    case "notUpdated":
      return {
        warning: true,
        message: "Its short link couldn't be updated, so the old file was kept and the short link still opens it",
      };
    default:
      return undefined;
  }
}

export function formatClicks(clicks: number | null) {
  if (clicks === null) return "Not reported by the shortener";
  return clicks === 1 ? "1 click" : `${clicks.toLocaleString()} clicks`;
}
