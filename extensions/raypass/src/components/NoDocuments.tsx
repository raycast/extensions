import type { FC } from "react";
import type { RevalidateDocuments } from "../types";
import { List, ActionPanel, Icon } from "@raycast/api";
import { NewDocumentAction, RefreshLocalReferencesActions, ExitRayPassAction } from "../actions";

interface Props {
  revalidateDocuments: RevalidateDocuments;
}

export const NoDocuments: FC<Props> = ({ revalidateDocuments }) => (
  <List.EmptyView
    icon={Icon.BlankDocument}
    actions={
      <ActionPanel title="No document actions">
        <ActionPanel.Section>
          <NewDocumentAction revalidateDocuments={revalidateDocuments} />
          <RefreshLocalReferencesActions />
          <ExitRayPassAction />
        </ActionPanel.Section>
      </ActionPanel>
    }
    title="No Documents"
    description="No password documents were found, open the action panel to create a new document (⌘⇧D) or refresh the local references (⌘⇧R) if you have existing documents that haven't been detected."
  />
);
