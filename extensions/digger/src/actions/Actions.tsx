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
   * An automated review flagged this against a "new actions should be appended"
   * rule and it was reverted once. Restored deliberately by the extension owner:
   * the rule protects a user's muscle memory for an EXISTING default, and both
   * sections that set this shipped in the same release as the flag — there was
   * no prior default to unlearn. If the finding returns, answer it with that;
   * do not silently revert again.
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
