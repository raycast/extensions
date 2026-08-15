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
  return (
    <ActionPanel>
      <ActionPanel.Section title="Browser">
        <BrowserActions url={url} />
      </ActionPanel.Section>

      {sectionActions && <ActionPanel.Section title="View">{sectionActions}</ActionPanel.Section>}

      <ActionPanel.Section title="Copy">
        <CopyActions data={data} url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section title="External Services">
        <ExternalActions url={url} />
      </ActionPanel.Section>

      <ActionPanel.Section title="Cache">
        <CacheActions onRefresh={onRefresh} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
