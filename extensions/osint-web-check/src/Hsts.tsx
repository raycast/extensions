import got from "got";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function Hsts({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "hsts", enabled, url, fetcher: getHsts });

  const detailContent = !data
    ? ""
    : data.compatible
      ? `## HSTS Enabled ✅\n ${data.message}`
      : `## HSTS Not Enabled ❌\n ${data.message}`;

  return (
    <List.Item
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
        </ActionPanel>
      }
      title="HSTS Check"
      detail={<List.Item.Detail isLoading={isLoading} markdown={detailContent} />}
    />
  );
}

async function getHsts(url: string): Promise<{ compatible: boolean; message: string }> {
  const headers = await got(url).then((res) => res.headers);
  const hstsHeader = headers["strict-transport-security"];

  if (!hstsHeader)
    return {
      compatible: false,
      message: "Site does not serve any HSTS headers.",
    };

  const maxAge = hstsHeader.match(/max-age=(\d+)/)?.[1];
  const includesSubdomain = /includessubdomains/i.test(hstsHeader);
  const includesPreload = /preload/i.test(hstsHeader);

  if (!maxAge || parseInt(maxAge) < 10886400)
    return {
      compatible: false,
      message: "HSTS max-age is less than 10886400.",
    };
  if (!includesSubdomain)
    return {
      compatible: false,
      message: "HSTS header does not include all subdomains.",
    };
  if (!includesPreload)
    return {
      compatible: false,
      message: "HSTS header does not contain the preload directive.",
    };

  return { compatible: true, message: "Site serves HSTS headers." };
}

const INFO = `
## HSTS

HTTP Strict Transport Security (HSTS) is a security feature that instructs web browsers to only communicate with a website over a secure HTTPS connection, reducing the risk of man-in-the-middle attacks and protocol downgrades. It helps enforce the use of encrypted connections and enhances the overall security of web browsing.
`.trim();
