import { useMemo } from "react";

import { Detail } from "@raycast/api";

import type { Project } from "@/api/types";
import { useDenoApi } from "@/hooks/useDenoApi";

const toLocaleString = (dateTimeStr: string) => {
  const dateTime = new Date(dateTimeStr);
  return dateTime.toLocaleString();
};

const updateNum = (dateTimeStr: string) => {
  const dateTime = new Date(dateTimeStr);
  return dateTime.getTime();
};

const ProjectDeployments = ({ project }: { project: Project }) => {
  const { useProjectDeployments } = useDenoApi();
  const { isLoading, data, error } = useProjectDeployments(project.id);

  const deploymentTable = useMemo(() => {
    if (isLoading) {
      return "Loading...";
    }
    if (error) {
      return (error as Error).message;
    }
    if (!data || data.length === 0) {
      return "No deployments found";
    }
    const markdown = `| ID | Status | Created At | Updated At |
| --- | --- | --- | --- |`;
    const content = data
      .sort((a, b) => updateNum(b.createdAt) - updateNum(a.createdAt))
      .map((deployment) => {
        const deploymentId =
          deployment.domains.length > 0 ? `[${deployment.id}](https://${deployment.domains[0]})` : deployment.id;

        return `| ${deploymentId} | ${deployment.status} | ${toLocaleString(deployment.createdAt)} | ${toLocaleString(
          deployment.updatedAt,
        )} |`;
      })
      .join("\n");
    return `${markdown}\n${content}`;
  }, [data, isLoading]);

  return (
    <Detail
      markdown={`
# ${project.name}

## Deployments

${deploymentTable}`}
    />
  );
};

export default ProjectDeployments;
