export type ServerEntry = {
  id: string;
  host: string;
  path: string;
  alias?: string;
  user?: string;
};

export type Share = {
  id: string;
  label: string;
  host: string;
  url: string;
};

// eslint-disable-next-line no-control-regex -- rejects control characters and Windows-reserved path characters
const INVALID_PATH_SEGMENT = /[\x00-\x1f<>:"\\|?*]/;

export function buildShare(entry: ServerEntry): Share {
  const host = entry.host.trim();
  const path = entry.path.trim();
  const alias = entry.alias?.trim();
  const user = entry.user?.trim();

  if (!/^[A-Za-z0-9.-]+$/.test(host)) {
    throw new Error(`Invalid IP address or hostname: "${entry.host}"`);
  }

  const segments = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (
    !segments.length ||
    segments.some((segment) => INVALID_PATH_SEGMENT.test(segment))
  ) {
    throw new Error(`Invalid share name or directory path: "${entry.path}"`);
  }

  const encodedPath = segments.map(encodeURIComponent).join("/");
  const authority = user ? `${encodeURIComponent(user)}@${host}` : host;

  return {
    id: entry.id,
    label: alias || segments[segments.length - 1],
    host,
    url: `smb://${authority}/${encodedPath}`,
  };
}
