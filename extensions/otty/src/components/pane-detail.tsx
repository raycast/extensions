import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { memo } from "react";
import { capturePane } from "../lib/otty";
import { abbreviateHome } from "../lib/paths";
import { previewMarkdown } from "../lib/preview";
import { statusIcon, usePollWhileIdle } from "../lib/ui";
import { agentStatus, type Row } from "../lib/workspace";

// Raycast cannot stream into a view, so the preview re-captures this often.
const REFRESH_MS = 1000;

/** Raycast mounts every row's detail, so only the `selected` row captures. */
export const PaneDetail = memo(function PaneDetail({
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
  usePollWhileIdle(revalidate, isLoading, capturing ? REFRESH_MS : null);

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
});
