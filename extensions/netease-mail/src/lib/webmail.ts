import { Clipboard, open, showHUD } from "@raycast/api";

const WEBMAIL_URLS: Record<string, string> = {
  "163.com": "https://mail.163.com/",
  "126.com": "https://mail.126.com/",
  "yeah.net": "https://mail.yeah.net/",
  "188.com": "https://mail.188.com/",
};

export function getWebMailUrl(emailAddress: string): string {
  const domain = emailAddress.split("@")[1]?.toLowerCase();
  return (domain && WEBMAIL_URLS[domain]) || "https://mail.163.com/";
}

export async function openWebMailSearch(emailAddress: string, query: string) {
  await Clipboard.copy(query);
  await open(getWebMailUrl(emailAddress));
  await showHUD("Opened NetEase Mail and copied the search text");
}
