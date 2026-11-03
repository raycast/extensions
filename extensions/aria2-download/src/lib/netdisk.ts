export const NETDISK_DOMAINS = [
  "baidu.com",
  "baidupcs.com",
  "aliyundrive.com",
  "aliyundrive.net",
  "alipan.com",
  "alicloudccp.com",
  "aliyundrive.cloud",
  "139.com",
  "cmecloud.cn",
  "189.cn",
  "xunlei.com",
  "quark.cn",
  "uc.cn",
  "123pan.com",
  "123pan.cn",
  "123684.com",
  "123865.com",
  "123952.com",
  "123912.com",
  "cjjd19.com",
];

export function isNetdiskUrl(uri: string | undefined): boolean {
  if (!uri) return false;
  try {
    const host = new URL(uri).hostname.toLowerCase();
    return NETDISK_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export function isMagnetUri(uri: string | undefined): boolean {
  return (
    typeof uri === "string" && uri.trim().toLowerCase().startsWith("magnet:")
  );
}

export function isHttpUrl(uri: string | undefined): boolean {
  if (!uri) return false;
  try {
    const protocol = new URL(uri).protocol;
    return protocol === "http:" || protocol === "https:" || protocol === "ftp:";
  } catch {
    return false;
  }
}

export function isDirectUrl(uri: string | undefined): boolean {
  return isHttpUrl(uri) && !isNetdiskUrl(uri);
}
