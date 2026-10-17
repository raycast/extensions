import { ReactNode } from "react";
import { ActionPanel } from "@raycast/api";
import { DiggerResult } from "../types";
import { BrowserActions } from "./BrowserActions";
import { CacheActions } from "./CacheActions";
import { CopyActions } from "./CopyActions";
import { ExternalActions } from "./ExternalActions";

interface ActionsProps {
  data: DiggerResult;
  url: string;
  onRefresh: () => void;
  sectionActions?: ReactNode;
  /**
   * Put the section's own actions above Browser, making the first of them the
   * default (⏎).
   *
   * Off by default — Open in Browser is the right default for most sections.
   * It is wrong for Well-Known and Theme, whose URLs mostly redirect to the
   * site's homepage, so ⏎ appeared to do nothing useful.
   *
   * An automated review flags this against a "new actions should be appended"
   * rule. It was reverted once to clear that finding, and restored deliberately
   * by the extension owner. The rule protects a user's habit for a USEFUL existing
   * default; the one replaced here was Open in Browser on `data.url` — the site the
   * user had just dug, already known to them — so on these two sections Enter did
   * nothing specific to the section and there is no habit worth keeping. Open in
   * Browser stays in the panel, and the CHANGELOG announces the change. If the
   * finding returns, answer it with that; do not silently revert again.
   */
  sectionActionsFirst?: boolean;
}

export function Actions({ data, url, onRefresh, sectionActions, sectionActionsFirst = false }: ActionsProps) {
  const section = sectionActions && <ActionPanel.Section title="View">{sectionActions}</ActionPanel.Section>;
  return (
    <ActionPanel>
      {sectionActionsFirst && section}

      <ActionPanel.Section title="Browser">
        <BrowserActions url={url} />
      </ActionPanel.Section>

      {!sectionActionsFirst && section}

      <ActionPanel.Section title="Copy">
        <CopyActions data={data} url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section title="External Services">
        <ExternalActions url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <CacheActions onRefresh={onRefresh} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
