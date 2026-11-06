import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { capturePane } from "../lib/otty";
import { statusIcon, useInterval } from "../lib/ui";
import { abbreviateHome, agentStatus, previewMarkdown, type Row } from "../lib/workspace";

// Raycast cannot stream into a view, so the preview re-captures this often.
const REFRESH_MS = 1000;

/**
 * Sidebar for a row: the last lines on screen in its pane, kept fresh while
 * open, above its status and folder. With `showPreview` off, only the metadata
 * shows and nothing is captured. Raycast mounts every row's detail, so only the
 * `selected` row captures.
 */
export function PaneDetail({
  row,
  selected,
  showPreview,
  showDetails,
}: {
  row: Row;
  selected: boolean;
  showPreview: boolean;
  showDetails: boolean;
}) {
  const { paneId } = row;
  const capturing = selected && showPreview && Boolean(paneId);
  const { data, isLoading, error, revalidate } = useCachedPromise(capturePane, [paneId ?? ""], {
    execute: capturing,
    onError: () => {},
  });
  // Skip a tick while the last capture is still running; a slow Otty would
  // otherwise keep superseding each capture before it can finish.
  useInterval(
    () => {
      if (!isLoading) revalidate();
    },
    capturing ? REFRESH_MS : null,
  );

  const markdown = showPreview ? previewMarkdown({ paneId, data, error }) : undefined;

  const status = agentStatus(row.agentState);
  const icon = statusIcon(row.agent, row.agentState, "");
  return (
    <List.Item.Detail
      isLoading={capturing && isLoading}
      markdown={markdown}
      metadata={
        showDetails ? (
          <List.Item.Detail.Metadata>
            {status ? (
              <List.Item.Detail.Metadata.Label title={row.agent || "Agent"} text={status.label} icon={icon.value} />
            ) : null}
            {row.label ? <List.Item.Detail.Metadata.Label title="Panes" text={row.labelTooltip} /> : null}
            {row.cwd ? (
              <List.Item.Detail.Metadata.Label title="Folder" text={abbreviateHome(row.cwd, homedir())} />
            ) : null}
          </List.Item.Detail.Metadata>
        ) : undefined
      }
    />
  );
}
