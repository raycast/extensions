const LINKABLE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "sms:", "ftp:", "ftps:"]);

export function isUrl(text: string): boolean {
  try {
    return LINKABLE_PROTOCOLS.has(new URL(text).protocol);
  } catch {
    return false;
  }
}
