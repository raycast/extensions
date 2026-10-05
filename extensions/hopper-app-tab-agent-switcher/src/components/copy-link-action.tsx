import { Action } from "@raycast/api";

/** Copy Link (⌘L), for sharing: shown on rows with a web address others can open (ADR-034). */
export function CopyLinkAction({ link }: { link: string | undefined }) {
  return link ? (
    <Action.CopyToClipboard title="Copy Link" content={link} shortcut={{ modifiers: ["cmd"], key: "l" }} />
  ) : null;
}
