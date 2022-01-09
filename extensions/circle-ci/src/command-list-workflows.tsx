import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { Workflow } from "./types";
import { circleCIPipelines, circleCIWorkflowsPipelines } from "./circleci-functions";
import { WorkflowListItem } from "./components/WorkflowListItem";
import { showError } from "./utils";

// noinspection JSUnusedGlobalSymbols
export default function WorkflowList() {
  const [isLoading, setIsLoading] = useState(true);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    circleCIPipelines()
      .then(pipelines => circleCIWorkflowsPipelines({ pipelines }))
      .then(wow => wow.flat())
      .then(setWorkflows)
      .then(() => setIsLoading(false))
      .catch(showError);
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter workflows by project name...">
      {workflows.map((workflow) => (
        <WorkflowListItem key={workflow.id} workflow={workflow} />
      ))}
    </List>
  );
}
