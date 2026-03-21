import { Action, Icon } from "@raycast/api";

interface ExternalActionsProps {
  url: string;
}

export function ExternalActions({ url }: ExternalActionsProps) {
  const domain = extractDomain(url);
  const waybackUrl = `https://web.archive.org/web/*/${url}`;
  const googleSearchUrl = `https://www.google.com/search?q=site:${domain}`;

  return (
    <>
      <Action.OpenInBrowser
        title="Open in Wayback Machine"
        url={waybackUrl}
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      />
      <Action.OpenInBrowser
        title="View on Google"
        url={googleSearchUrl}
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
      />
    </>
  );
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}
