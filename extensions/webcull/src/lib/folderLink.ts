// WebCull opens folders with an account hash and a base62 folder ID.
export function folderUrl(appBaseUrl: string, accountHash: string, folderId: number): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let encoded = "";
  while (folderId > 0) {
    encoded = alphabet[folderId % 62] + encoded;
    folderId = Math.floor(folderId / 62);
  }
  return `${appBaseUrl}/${accountHash}${encoded ? `#~/${encoded}` : ""}`;
}
