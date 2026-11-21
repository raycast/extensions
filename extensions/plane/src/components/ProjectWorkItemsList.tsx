import { List } from "@raycast/api";
import { Project } from "@makeplane/plane-node-sdk";
import { useProjectWorkItems } from "../hooks/useProjectWorkItems";
import { parseHtmlToMarkdown } from "../helpers/parser";
import useMe from "../hooks/useMe";
import WorkItemListItem from "./WorkItemListItem";
import ErrorEmptyView from "./ErrorEmptyView";
import { arrayMutator } from "./actions/WorkItemActions";

export default function ProjectWorkItemsList({ projectItem }: { projectItem: Project }) {
  const { isLoading, workItems, pagination, error, mutate, revalidate } = useProjectWorkItems({
    id: projectItem.id as string,
    identifier: projectItem.identifier,
    name: projectItem.name,
  });
  const { me } = useMe();

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={workItems.length > 0}
      pagination={pagination}
      navigationTitle={projectItem.name}
      searchBarPlaceholder={`Filter ${projectItem.identifier} work items`}
    >
      {error && workItems.length === 0 ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No work items in this project" />
      )}
      {workItems.map((workItem) => (
        <WorkItemListItem
          key={workItem.id}
          workItem={workItem}
          mutate={arrayMutator(mutate)}
          mutateWorkItemList={revalidate}
          currentUserId={me?.id}
          detail={
            <List.Item.Detail
              markdown={`# ${workItem.name}\n\n---\n\n${parseHtmlToMarkdown(workItem.descriptionHtml ?? "")}`}
            />
          }
        />
      ))}
    </List>
  );
}
