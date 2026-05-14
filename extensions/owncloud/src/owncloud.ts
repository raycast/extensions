import { getPreferenceValues } from "@raycast/api";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

interface WebDAVProp {
  fileid: string;
  getcontenttype: string;
  resourcetype: { collection: "" } | string;
  size: string;
}
interface WebDAVPropstat {
  prop: WebDAVProp;
  status: string;
}
interface WebDAVResponse {
  href: string;
  propstat: WebDAVPropstat[];
}
interface WebDAVMultistatus {
  multistatus: {
    response?: WebDAVResponse[];
  };
}
type SuccessResult = WebDAVMultistatus;

type FailureResult = {
  error: {
    exception: string;
    message: string;
  };
};

const { url, username, password } = getPreferenceValues<Preferences>();
const parser = new XMLParser({
  removeNSPrefix: true,
  isArray: (name) => ["response", "propstat"].includes(name),
});
const builder = new XMLBuilder({
  ignoreAttributes: false,
  suppressEmptyNode: true,
  format: true,
});
export const search = async (pattern: string) => {
  const url_ = new URL(`remote.php/dav/files/${username}`, url);
  const body = builder.build({
    "?xml": {
      "@_version": "1.0",
      "@_encoding": "UTF-8",
    },
    "oc:search-files": {
      "@_xmlns:a": "DAV:",
      "@_xmlns:oc": "http://owncloud.org/ns",
      "a:prop": {
        "oc:fileid": "",
        "a:getcontenttype": "",
        "a:resourcetype": "",
        "oc:size": "",
      },
      "oc:search": {
        "oc:pattern": pattern,
      },
    },
  });
  const response = await fetch(url_, {
    method: "REPORT",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "Content-Type": "text/xml",
    },
    body,
  });
  const result = await response.text();
  let parsed: FailureResult | SuccessResult;
  try {
    parsed = await parser.parse(result);
  } catch {
    throw new Error(response.statusText); // Fail to parse
  }
  if ("error" in parsed) throw new Error(parsed.error.message); // ownCloud error
  if (!response.ok) throw new Error(response.statusText); // Unknown error
  if (!parsed.multistatus.response) return []; // Empty result
  return parsed.multistatus.response.map((res) => {
    const href = res.href;
    const propstat = res.propstat[0].prop;
    const { fileid, resourcetype, size } = propstat;
    const name = decodeURIComponent(href.split("/").pop() ?? "");
    return { id: fileid, href, name, size: +size, isCollection: typeof resourcetype !== "string" };
  });
};
