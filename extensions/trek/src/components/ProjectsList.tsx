import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { fetchProjects } from "../oauth/auth";
import { DockItemsList } from "./DockItemsList";
import { useState, useEffect } from "react";
import { isCacheStale, CACHE_KEYS } from "../utils/cache";

interface ProjectsListProps {
  accountId: number;
  accountName: string;
}

export default function ProjectsList({ accountId, accountName }: ProjectsListProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldForceRefresh, setShouldForceRefresh] = useState(false);
  const [isCacheExpired, setIsCacheExpired] = useState(true);

  const { isLoading, data, pagination, revalidate } = usePromise(
    (accountId: number, forceRefresh: boolean) => async (options: { page: number }) => {
      try {
        const response = await fetchProjects(accountId.toString(), options.page, forceRefresh && options.page === 1);
        return {
          data: response.data,
          hasMore: response.nextPage !== null,
        };
      } catch (error) {
        showFailureToast(error, { title: "Error fetching projects" });
        return {
          data: [],
          hasMore: false,
        };
      }
    },
    [accountId, shouldForceRefresh],
  );

  useEffect(() => {
    const checkCacheStatus = async () => {
      const isStale = await isCacheStale(CACHE_KEYS.PROJECTS(accountId.toString()));
      setIsCacheExpired(isStale);
    };

    checkCacheStatus();
  }, [accountId, data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setShouldForceRefresh(true);
    await revalidate();
    setIsRefreshing(false);
    setShouldForceRefresh(false);
    showToast({
      style: Toast.Style.Success,
      title: "Projects refreshed successfully",
    });
  };

  const sortedProjects = data?.sort((a, b) => {
    if (a.bookmarked === b.bookmarked) return 0;
    return a.bookmarked ? -1 : 1;
  });

  return (
    <List
      isLoading={isLoading || isRefreshing}
      pagination={pagination}
      navigationTitle={accountName}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Actions"
          storeValue={false}
          onChange={(value) => {
            if (value === "refresh") {
              handleRefresh();
            }
          }}
        >
          <List.Dropdown.Item title="Actions" value="" />
          <List.Dropdown.Item
            title={isCacheExpired ? "Refresh Projects (Cache Expired)" : "Refresh Projects"}
            value="refresh"
            icon={Icon.ArrowClockwise}
          />
        </List.Dropdown>
      }
    >
      {sortedProjects?.map((project) => (
        <List.Item
          key={project.id}
          title={project.name}
          icon={project.bookmarked ? Icon.Tack : undefined}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select Project"
                target={<DockItemsList accountId={accountId.toString()} project={project} />}
              />
              <Action.OpenInBrowser
                title="Open Project"
                url={`https://3.basecamp.com/${accountId}/projects/${project.id}`}
              />
              <Action
                title="Refresh Projects"
                icon={Icon.ArrowClockwise}
                onAction={handleRefresh}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
