import type { RevalidateRecords } from "../types";
import { List, ActionPanel, Icon } from "@raycast/api";
import { NewRecordAction, ManageDocumentsAction, RefreshLocalReferencesActions, ExitRayPassAction } from "../actions";

interface Props {
  documentName: string;
  revalidateRecords: RevalidateRecords;
}

export const NoRecords: React.FC<Props> = ({ documentName, revalidateRecords }) => (
  <List.EmptyView
    actions={
      <ActionPanel title="RayPass Actions">
        <NewRecordAction revalidateRecords={revalidateRecords} />
        <ManageDocumentsAction />
        <RefreshLocalReferencesActions />
        <ExitRayPassAction />
      </ActionPanel>
    }
    icon={Icon.MagnifyingGlass}
    title="No password records"
    description={`There are no password records in the current document (${documentName}). Create a new password record (⌘N) or open an existing document with password records (⌘O).`}
  />
);
