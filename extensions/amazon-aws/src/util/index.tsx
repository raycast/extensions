import { Action } from "@raycast/api";

export function getActionOpenInBrowser(url: string) {
  return <Action.OpenInBrowser key={"browser"} title="Open in Browser" url={url} />;
}

export function getFilterPlaceholder(type: string, searchType?: string) {
  return `Filter ${type} by ${searchType ? searchType : "name"}`;
}

export function getExportResponse(response: any) {
  return (
    <Action.CopyToClipboard
      title="Copy Service Response"
      content={JSON.stringify(response, null, 2)}
      shortcut={{ modifiers: ["opt"], key: "e" }}
    />
  );
}
