import { Action, ActionPanel, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { findSpreadsheets, SheetFile } from "./spreadsheet-files";
import { runVgrid } from "./vgrid";

/** Browse recent spreadsheets; the detail pane renders `vgrid peek` output. */

function useSpreadsheets() {
  const [files, setFiles] = useState<SheetFile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    findSpreadsheets()
      .then(setFiles)
      .finally(() => setLoading(false));
  }, []);
  return { files, loading };
}

function PeekDetail(props: { file: SheetFile }) {
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    runVgrid(["peek", props.file.path])
      .then((out) => {
        if (cancelled) return;
        // peek may print an import log line before the grid; keep grid only.
        const grid = out
          .split("\n")
          .filter((l) => !l.startsWith("["))
          .join("\n")
          .trimEnd();
        setMarkdown("```\n" + grid + "\n```");
      })
      .catch((e: Error) => {
        if (!cancelled) setMarkdown(`Couldn't peek: ${e.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [props.file.path]);

  return (
    <List.Item.Detail isLoading={markdown === null} markdown={markdown ?? ""} />
  );
}

export default function Peek() {
  const { files, loading } = useSpreadsheets();

  return (
    <List
      isLoading={loading}
      isShowingDetail
      searchBarPlaceholder="Search spreadsheets…"
    >
      {files.map((f) => (
        <List.Item
          key={f.path}
          title={f.name}
          accessories={[{ date: f.modified }]}
          detail={<PeekDetail file={f} />}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open in VisiGrid"
                target={f.path}
                application="VisiGrid"
              />
              <Action.ShowInFinder path={f.path} />
              <Action.CopyToClipboard title="Copy Path" content={f.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
