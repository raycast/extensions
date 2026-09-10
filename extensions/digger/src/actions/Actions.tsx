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
}

export function Actions({ data, url, onRefresh, sectionActions }: ActionsProps) {
  const section = sectionActions && <ActionPanel.Section title="View">{sectionActions}</ActionPanel.Section>;
  return (
    <ActionPanel>
      {/* Browser stays first, so a section's own actions are APPENDED and the
          default action of every section is unchanged. Section actions that
          deserve one-keystroke access carry their own shortcut instead. */}
      <ActionPanel.Section title="Browser">
        <BrowserActions url={url} />
      </ActionPanel.Section>

      {section}

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
