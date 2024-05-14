import { Action, Icon } from "@raycast/api";
import { ChartActionsProps } from "./types";
import { duplicateChart } from "./duplicateChart";
export default function ChartActions({ data, children }: ChartActionsProps) {
  return (
    <>
      {/* add any children first */}
      {children}

      {/* open chart editing interface in browser */}
      <Action.OpenInBrowser
        url={`https://app.datawrapper.de/chart/${data.id}/edit`}
        title="Open Chart in Browser"
        icon={"icon.png"}
      />
      <Action
        title="Duplicate Chart"
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => duplicateChart(data)}
        icon={Icon.Duplicate}
      />
      {/* if there's a public version, show ability to open/copy sharing link */}
      {data.publicVersion ? (
        <>
          <Action.OpenInBrowser
            url={`https://www.datawrapper.de/_/${data.id}/`}
            title="Open Sharing Link in Browser"
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            content={`https://www.datawrapper.de/_/${data.id}/`}
            title="Copy Sharing Link"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </>
      ) : null}
    </>
  );
}
