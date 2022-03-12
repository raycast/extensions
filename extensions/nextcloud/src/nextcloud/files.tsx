import { environment } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";
import fetch from "node-fetch";
import path from "path";
import { getPreferences } from "../lib/preferences";

export interface SearchResult {
  fullpath: string;
  dirname: string;
  filename: string;
  fileId: number;
  contentType: string;
  size: number;
}

export interface Favorite {
  fullpath: string;
  dirname: string;
  filename: string;
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

function makeBodyForListFavorites() {
  return `<?xml version="1.0"?>
<oc:filter-files  xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <oc:filter-rules>
    <oc:favorite>1</oc:favorite>
  </oc:filter-rules>
</oc:filter-files>
`;
}

export async function performSearch(signal: AbortSignal, query?: string): Promise<SearchResult[]> {
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

export async function performListFavorites(signal: AbortSignal): Promise<Favorite[]> {
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

async function webdavRequest({
  signal,
  body,
  base = "",
  method,
}: {
  signal: AbortSignal;
  body: string;
  base?: string;
  method: string;
}) {
  const { hostname, username, password } = getPreferences();

  const response = await fetch(`https://${hostname}/remote.php/dav/${encodeURI(base)}`, {
    method,
    headers: {
      "User-Agent": `Raycast/${environment.raycastVersion}`,
      "Content-Type": "text/xml",
      Authorization: "Basic " + Buffer.from(username + ":" + password).toString("base64"),
    },
    body,
    signal,
  });
  const responseBody = await response.text();

  const parser = new XMLParser();
  const dom = parser.parse(responseBody);
  if (!("d:multistatus" in dom)) {
    throw new Error("Invalid response: " + responseBody);
  }

  // undefined -> No result
  // Object -> Single hit
  // Array -> Multiple hits
  const dres = dom["d:multistatus"]["d:response"] ?? [];
  return Array.isArray(dres) ? dres : [dres];
}
