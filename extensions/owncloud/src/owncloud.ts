import { getPreferenceValues } from "@raycast/api";
import { XMLParser } from "fast-xml-parser";

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
    response: WebDAVResponse[];
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
export const search = async (pattern: string) => {
  const url_ = new URL(`remote.php/dav/files/${username}`, url);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
    <oc:search-files
        xmlns:a="DAV:"
        xmlns:oc="http://owncloud.org/ns">
        <a:prop>
            <oc:fileid />
            <a:getcontenttype />
            <a:resourcetype />
            <oc:size />
        </a:prop>
        <oc:search>
            <oc:pattern>${pattern}</oc:pattern>
        </oc:search>
    </oc:search-files>`;
  const response = await fetch(url_, {
    method: "REPORT",
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      "Content-Type": "text/xml",
    },
    body,
  });
  const result = await response.text();
  const parsed = (await parser.parse(result)) as FailureResult | SuccessResult;
  if ("error" in parsed) throw new Error(parsed.error.message);
  return parsed.multistatus.response.map((res) => {
    const href = res.href;
    const propstat = res.propstat[0].prop;
    const { fileid, resourcetype, size } = propstat;
    const name = decodeURIComponent(href.split("/").pop() ?? "");
    return { id: fileid, href, name, size: +size, isCollection: typeof resourcetype !== "string" };
  });
};
