import { Notification } from "./notifications";
import { ghCommandPath } from "./preference";
import { execAsync } from "./util";

export const toHtmlUrl = async (n: Notification) => {
  const url = n.subject.latest_comment_url ?? n.subject.url;
  if (url === null) return "https://github.com/notifications?query=is%3Aunread";
  return (await execAsync(`${ghCommandPath} api ${url} --jq '.html_url'`)).stdout;
};
