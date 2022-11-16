import path from "path";
import { useCallback, useState } from "react";
import { useQuery, webdavRequest } from "../nextcloud";
import { getPreferences } from "../preferences";

export function useSearch() {
  const [query, setQuery] = useState<string>();
  const { data, isLoading } = useQuery((signal) => performSearch(signal, query), [query]);

  const search = useCallback((query: string) => {
    setQuery(query);
  }, []);

  return {
    search,
    isLoading,
    results: data ?? [],
  };
}

function makeBodyForSearch({ username, query, scope = "" }: { username: string; query: string; scope?: string }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<d:searchrequest xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:basicsearch>
    <d:select>
      <d:prop>
        <oc:fileid/>
        <d:displayname/>
        <d:getcontenttype/>
        <oc:size/>
      </d:prop>
    </d:select>
    <d:from>
      <d:scope>
        <d:href>/files/${encodeURIComponent(username)}/${scope.replace(/^\/+/, "")}</d:href>
        <d:depth>infinity</d:depth>
      </d:scope>
    </d:from>
    <d:where>
        <d:like>
          <d:prop>
            <d:displayname/>
          </d:prop>
          <d:literal>%${query.replace(/%/g, "\\%")}%</d:literal>
        </d:like>
    </d:where>
    <d:orderby/>
  </d:basicsearch>
</d:searchrequest>`;
}

async function performSearch(signal: AbortSignal, query?: string): Promise<SearchResult[]> {
  if (!query || query.length === 0) return [];

  const { scope, username } = getPreferences();
  const body = makeBodyForSearch({ username, query, scope });
  const items = await webdavRequest({ body, signal, method: "SEARCH" });

  const res = items.map(
    (item: {
      "d:href": string;
      "d:propstat": { "d:prop": { "oc:fileid": number; "d:getcontenttype": string; "oc:size": number } }[];
    }) => {
      const href = item["d:href"];
      const match = /^\/remote.php\/dav\/files\/[^/]+?\/(.+?)$/.exec(href);
      if (!match) throw new Error("Invalid href: " + href);
      const fullpath = "/" + decodeURIComponent(match[1]);
      const dirname = path.dirname(fullpath);
      const filename = path.basename(fullpath);

      const prop = item["d:propstat"][0]["d:prop"];
      const fileId = prop["oc:fileid"];
      const contentType = prop["d:getcontenttype"];
      const size = prop["oc:size"];

      return {
        fullpath,
        dirname,
        filename,
        fileId,
        contentType,
        size,
      };
    }
  );

  return res;
}

export interface SearchResult {
  fullpath: string;
  dirname: string;
  filename: string;
  fileId: number;
  contentType: string;
  size: number;
}
