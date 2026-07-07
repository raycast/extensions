/**
 * Unified-diff rendering. Every dashboard diff route (snapshots, config preview /
 * history, drift) returns `{ summary, unified }`; we render the `unified` string
 * as Raycast Detail markdown inside a ```diff fence (which highlights +/-/@@),
 * with a compact `+added / −removed` header.
 */
import { Detail } from "@raycast/api";
import type { ReactNode } from "react";

export interface DiffLike {
  added?: number;
  removed?: number;
}

/** Build the markdown body for a unified diff. */
export function diffMarkdown(
  unified: string,
  summary?: DiffLike,
  title?: string,
): string {
  const head = summary
    ? `**+${summary.added ?? 0} / −${summary.removed ?? 0}**\n\n`
    : "";
  const body =
    unified && unified.trim()
      ? `\`\`\`diff\n${unified}\n\`\`\``
      : "_No differences._";
  return `${title ? `## ${title}\n\n` : ""}${head}${body}`;
}

export function DiffDetail(props: {
  unified: string;
  summary?: DiffLike;
  title?: string;
  navigationTitle?: string;
  isLoading?: boolean;
  actions?: ReactNode;
}): ReactNode {
  return (
    <Detail
      markdown={diffMarkdown(props.unified, props.summary, props.title)}
      navigationTitle={props.navigationTitle}
      isLoading={props.isLoading}
      actions={props.actions}
    />
  );
}
