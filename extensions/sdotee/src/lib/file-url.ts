interface UploadedFile {
  page?: string;
  path?: string;
  storename: string;
  url?: string;
}

function isHttpUrl(value?: string): value is string {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export function getShareableFileUrl(
  file: UploadedFile,
  domain?: string,
): string {
  if (domain) return `https://${domain}/${file.storename}`;
  if (isHttpUrl(file.page)) return file.page;
  if (isHttpUrl(file.url)) return file.url;
  if (isHttpUrl(file.path)) return file.path;
  throw new Error(
    "Upload succeeded but no shareable URL was returned by the server",
  );
}
