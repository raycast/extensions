import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../../api/clickup";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";
import { CopyBody, CopyId } from "../../components/actions/CopyActions";
import { pluralize } from "../../utils/format-helpers";
import { buildDocPageRoute } from "../../utils/link-helpers";

interface Props {
  workspaceId: string;
  docId: string;
  docName: string;
}

export function ListDocPages({ workspaceId, docId, docName }: Props) {
  const { isLoading, data: pages } = useCachedPromise(
    async (wsId: string, dId: string) => getClickUpClient().getDocPages(wsId, dId),
    [workspaceId, docId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search pages" navigationTitle={`${docName} / Pages`}>
      <List.Section title="Pages" subtitle={`${pages.length} ${pluralize(pages.length, "page")}`}>
        {pages.map((page) => {
          const markdown = `# ${page.name}\n\n${page.content}`;
          return (
            <List.Item
              key={page.id}
              icon={page.archived ? Icon.XMarkCircle : Icon.Document}
              title={page.name}
              accessories={page.archived ? [{ tag: "Archived" }] : undefined}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Navigation">
                    <Action.Push
                      icon={Icon.Eye}
                      title="View Page"
                      target={
                        <Detail
                          navigationTitle={page.name}
                          markdown={markdown}
                          actions={
                            <ActionPanel>
                              <OpenInClickUpAction route={buildDocPageRoute(workspaceId, docId, page.id)} />
                              <CopyBody content={markdown} />
                              <CopyId id={page.id} />
                            </ActionPanel>
                          }
                        />
                      }
                    />
                    <OpenInClickUpAction route={buildDocPageRoute(workspaceId, docId, page.id)} />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Copy">
                    <CopyBody content={markdown} />
                    <CopyId id={page.id} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
