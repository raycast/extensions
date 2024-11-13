import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchProjects } from "../oauth/auth";
import { DockItemsList } from "./DockItemsList";

interface ProjectsListProps {
  accountId: string;
  accountName: string;
}

export default function ProjectsList({ accountId, accountName }: ProjectsListProps) {
  const { isLoading, data, pagination } = usePromise(
    (accountId: string) => async (options: { page: number }) => {
      const response = await fetchProjects(accountId, options.page);
      return {
        data: response.data,
        hasMore: response.nextPage !== null,
      };
    },
    [accountId],
  );

  const sortedProjects = data?.sort((a, b) => {
    if (a.bookmarked === b.bookmarked) return 0;
    return a.bookmarked ? -1 : 1;
  });

  return (
    <List isLoading={isLoading} pagination={pagination} navigationTitle={accountName}>
      {sortedProjects?.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          icon={project.bookmarked ? Icon.Tack : undefined}
          actions={
            <ActionPanel>
              <Action.Push title="Select Project" target={<DockItemsList accountId={accountId} project={project} />} />
              <Action.OpenInBrowser
                title="Open Project"
                url={`https://3.basecamp.com/${accountId}/projects/${project.id}`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
