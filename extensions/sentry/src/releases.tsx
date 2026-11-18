import { List } from "@raycast/api";
import { useState } from "react";
import { ReleaseListItem } from "./ReleaseListItem";
import { useReleases } from "./sentry";
import { Project } from "./types";
import { ProjectDropdown } from "./ProjectDropdown";
import { UnauthorizedError } from "./UnauthorizedError";

export default function Command() {
  const [project, setProject] = useState<Project>();
  const [projectError, setProjectError] = useState<Error>();
  const { data, error, isLoading, pagination } = useReleases(project);

  if (projectError || (error && error instanceof Error && error.message.includes("Unauthorized"))) {
    return <UnauthorizedError />;
  }

  return (
    <List
      isLoading={!project || isLoading}
      pagination={pagination}
      searchBarPlaceholder="Filter releases by version"
      searchBarAccessory={<ProjectDropdown onProjectChange={setProject} onError={setProjectError} />}
    >
      {data?.map((release) => (
        <ReleaseListItem key={release.version} release={release} orgSlug={project?.organization?.slug} />
      ))}
    </List>
  );
}
