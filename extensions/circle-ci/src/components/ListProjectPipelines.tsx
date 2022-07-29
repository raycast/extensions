import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { circleCIProjectPipelines, circleCIWorkflows } from "../circleci-functions";
import { Pipeline } from "../types";
import { PipelineItem } from "./PipelineItem";
import { ProjectWorkflowListItem } from "./ProjectWorkflowListItem";
import { showError } from "../utils";

interface Params {
  full_name: string;
  uri: string;
}

export const ListProjectPipelines = ({ full_name, uri }: Params) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const load = () =>
    Promise.resolve()
      .then(() => setIsLoading(true))
      .then(() => circleCIProjectPipelines(uri))
      .then((pipelines) =>
        Promise.all(pipelines.map(({ id }) => circleCIWorkflows({ id }))).then((workflows) => ({
          pipelines,
          workflows,
        }))
      )
      .then(({ pipelines, workflows }) => {
        pipelines.forEach((p, i) => {
          p.workflows = workflows[i];
          workflows[i].forEach((workflow) => (workflow.pipeline = p));
          workflows[i].forEach((workflow) => (workflow.repository = p.vcs));
        });
        setPipelines(pipelines);
      })
      .then(() => setIsLoading(false));

  useEffect(() => {
    load().catch(showError);
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle={full_name}>
      {Object.entries(
        pipelines.reduce((acc, val) => {
          const date = new Date(val.created_at).toLocaleDateString();

          (acc[date] = acc[date] || []).push(val);

          return acc;
        }, {} as Record<string, Pipeline[]>)
      )
        .sort(([l], [r]) => new Date(l).getTime() - new Date(r).getTime())
        .reverse()
        .map(([date, items]) => (
          <List.Section key={date} title={date}>
            {items
              .map((item) =>
                item.workflows && item.workflows.length > 0 ? (
                  item.workflows.map((workflow) => <ProjectWorkflowListItem key={workflow.id} workflow={workflow} />)
                ) : (
                  <PipelineItem key={item.id} pipeline={item} onReload={load} />
                )
              )
              .flat()}
          </List.Section>
        ))}
    </List>
  );
};
