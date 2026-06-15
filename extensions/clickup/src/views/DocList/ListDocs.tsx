import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
import { ListDocPages } from "./ListDocPages";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";
import { CopyId } from "../../components/actions/CopyActions";
import { pluralize } from "../../utils/format-helpers";
import { buildDocRoute } from "../../utils/link-helpers";

interface Props {
  workspaceId: string;
  workspaceName: string;
}

export function ListDocs({ workspaceId, workspaceName }: Props) {
  const { isLoading, data: docs } = useCachedPromise(
    async (id: string) => getClickUpClient().getDocs(id),
    [workspaceId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search docs" navigationTitle={`${workspaceName} / Docs`}>
      <List.Section title="Docs" subtitle={`${docs.length} ${pluralize(docs.length, "doc")}`}>
        {docs.map((doc) => (
          <List.Item
            key={doc.id}
            icon={doc.public ? Icon.Globe : Icon.Document}
            title={doc.name}
            accessories={[{ tag: doc.public ? "Public" : "Private" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.ChevronRight}
                  title="Browse Pages"
                  target={<ListDocPages workspaceId={workspaceId} docId={doc.id} docName={doc.name} />}
                />
                <OpenInClickUpAction route={buildDocRoute(workspaceId, doc.id)} />
                <CopyId id={doc.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
