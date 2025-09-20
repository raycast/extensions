import { useCallback, useEffect, useState } from "react";

import { Icon, List } from "@raycast/api";

import { useErrorBoundary } from "@/context/ErrorBoundary";
import { ProjectListProvider } from "@/context/ProjectList";
import { useDenoApi } from "@/hooks/useDenoApi";
import useDenoState from "@/hooks/useDenoState";
import OrganizationSwitcher from "@/pages/components/organization-switcher";
import ProjectsListItem from "@/pages/components/projects-list-item";

const ProjectListSectionList = ({ orgId }: { orgId: string }) => {
  const [query, setQuery] = useState("");
  const { throwError } = useErrorBoundary();
  const { useProjects } = useDenoApi();
  const { user } = useDenoState();
  const { isLoading, data, error, revalidate } = useProjects(orgId, query);

  useEffect(() => {
    if (error) {
      throwError(error);
    }
  }, [error, throwError]);

  const refresh = useCallback(() => {
    revalidate();
  }, [revalidate]);

  return (
    <ProjectListProvider refresh={refresh}>
      <List
        searchBarPlaceholder="Search Projects..."
        navigationTitle="Results"
        onSearchTextChange={setQuery}
        isLoading={isLoading || !user}
        searchBarAccessory={<>{user ? <OrganizationSwitcher onTeamChange={refresh} /> : null}</>}
        isShowingDetail={!error && data && data.length > 0}
      >
        {error && (
          <List.Item title="Error" subtitle={error.message} icon={{ source: Icon.XMarkCircle, tintColor: "red" }} />
        )}
        {!error && data && data.length > 0
          ? data
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((project) => <ProjectsListItem key={project.id + project.updatedAt} project={project} />)
          : null}
      </List>
    </ProjectListProvider>
  );
};

const ProjectListSection = () => {
  const { selectedOrganization } = useDenoState();

  return selectedOrganization ? <ProjectListSectionList orgId={selectedOrganization} /> : null;
};

export default ProjectListSection;
