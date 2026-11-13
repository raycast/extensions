import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { findSpreadsheets, SheetFile } from "./spreadsheet-files";
import { runVgrid } from "./vgrid";

/** Browse recent spreadsheets; the detail pane renders `vgrid peek` output. */

function PeekDetail(props: { file: SheetFile }) {
  const {
    data: markdown,
    isLoading,
    error,
  } = useCachedPromise(
    async (path: string) => {
      const out = await runVgrid(["peek", path]);
      // peek may print an import log line before the grid; keep grid only.
      const grid = out
        .split("\n")
        .filter((l) => !l.startsWith("["))
        .join("\n")
        .trimEnd();
      return "```\n" + grid + "\n```";
    },
    [props.file.path],
  );

  return (
    <List.Item.Detail isLoading={isLoading} markdown={error ? `Couldn't peek: ${error.message}` : (markdown ?? "")} />
  );
}

export default function Peek() {
  const { data: files = [], isLoading, error } = useCachedPromise(findSpreadsheets, []);

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search spreadsheets…">
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Document}
        title={error ? "Couldn't Find Spreadsheets" : "No Spreadsheets Found"}
        description={error ? error.message : "No recent .xlsx, .csv, or .sheet files under your home folder."}
      />
      {files.map((f) => (
        <List.Item
          key={f.path}
          title={f.name}
          accessories={[{ date: f.modified }]}
          detail={<PeekDetail file={f} />}
          actions={
            <ActionPanel>
              <Action.Open title="Open in VisiGrid" target={f.path} application="VisiGrid" />
              <Action.ShowInFinder path={f.path} />
              <Action.CopyToClipboard title="Copy Path" content={f.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
