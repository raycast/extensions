import path from "path";
import { useQuery, webdavRequest } from "../nextcloud";
import { getPreferences } from "../preferences";

export function useFavorites() {
  const { data, isLoading } = useQuery((signal) => performListFavorites(signal));

  return {
    favorites: data ?? [],
    isLoading,
  };
}

async function performListFavorites(signal: AbortSignal): Promise<Favorite[]> {
  const { username } = getPreferences();
  const body = makeBodyForListFavorites();
  const items = await webdavRequest({ body, signal, base: `files/${encodeURIComponent(username)}`, method: "REPORT" });
  const res = items.map((item) => {
    const href = item["d:href"];
    const match = /^\/remote.php\/dav\/files\/[^/]+?\/(.+?)$/.exec(href);
    if (!match) throw new Error("Invalid href: " + href);
    const fullpath = "/" + decodeURIComponent(match[1]);
    const dirname = path.dirname(fullpath);
    const filename = path.basename(fullpath);

    return {
      fullpath,
      dirname,
      filename,
    };
  });
  return res;
}

function makeBodyForListFavorites() {
  return `<?xml version="1.0"?>
    <oc:filter-files  xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
      <oc:filter-rules>
        <oc:favorite>1</oc:favorite>
      </oc:filter-rules>
    </oc:filter-files>
    `;
}

export interface Favorite {
  fullpath: string;
  dirname: string;
  filename: string;
}
