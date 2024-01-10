import { List } from "@raycast/api";
import { AsyncState } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ProjectSection } from "./projects/ProjectSection";
import { ErrorView } from "./ErrorView";
import { saveLastMrUpdateTimes } from "./storage";
import { MergeRequest, allMergedMergeRequestsToday, allOpenMergeRequests } from "./gitlab/mergeRequest";
import { Pipeline, getLatestPipelineForBranch } from "./gitlab/pipeline";
import { Project } from "./gitlab/project";
import { useLoadingToast } from "./hooks/useLoadingToast";

export class NoProjectsError extends Error {}

export function MyDashboard(props: { projects: Project[] }) {
  if (props.projects.length === 0) {
    return <NoProjectsErrorView />;
  }

  const mergeRequests = [
    ...props.projects.map((proj) => proj.fullPath).map(allOpenMergeRequests),
    ...props.projects.map((proj) => proj.fullPath).map(allMergedMergeRequestsToday),
  ];
  const latestPipelines = props.projects.map((proj) => getLatestPipelineForBranch(proj.fullPath, proj.defaultBranch));
  const allNetworkRequests = [...mergeRequests, ...latestPipelines];

  const [selectedProject, setSelectedProject] = useState<Project>();

  useEffect(() => {
    if (mergeRequests.every((r) => !r.isLoading && !r.error)) {
      const fetchedMrs = mergeRequests.flatMap((r) => r.data).filter((mr): mr is MergeRequest => !!mr);
      saveLastMrUpdateTimes(fetchedMrs);
    }
  }, [mergeRequests.some((r) => r.isLoading)]);

  useLoadingToast(
    "Fetching MRs",
    allNetworkRequests.some((r) => r.isLoading),
  );
  return (
    <List
      isLoading={allNetworkRequests.some((r) => r.isLoading)}
      searchBarAccessory={<ProjectsDropdown projects={props.projects} onSelect={setSelectedProject} />}
    >
      {allNetworkRequests.some((r) => r.error) ? (
        <ErrorView error={allNetworkRequests.find((r) => r.error)!.error!} />
      ) : (
        props.projects
          .filter((proj) => (selectedProject ?? proj).id === proj.id)
          .map((proj) => (
            <ProjectSection
              key={proj.id}
              projectId={proj.id}
              projectName={proj.name}
              latestPipeline={unwrapPipelineByProject(latestPipelines, proj.fullPath)}
              mrs={unwrapMergeRequestsByProject(mergeRequests, proj.fullPath)}
            />
          ))
      )}
    </List>
  );
}

function ProjectsDropdown(props: { projects: Project[]; onSelect: (proj: Project | undefined) => void }) {
  return (
    <List.Dropdown
      tooltip="Select project"
      onChange={(selected) =>
        props.onSelect(selected === "-" ? undefined : props.projects.find((proj) => proj.id === selected))
      }
    >
      <List.Dropdown.Section>
        <List.Dropdown.Item key={0} title="All projects" value="-" />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        {props.projects.map((proj) => (
          <List.Dropdown.Item key={proj.id} title={proj.name} value={proj.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function unwrapMergeRequestsByProject(requests: AsyncState<MergeRequest[]>[], projFullPath: string): MergeRequest[] {
  return requests
    .flatMap((r) => r.data)
    .filter((mr): mr is MergeRequest => !!mr)
    .filter((mr) => mr.project.fullPath === projFullPath);
}

function unwrapPipelineByProject(requests: AsyncState<Pipeline>[], projFullPath: string): Pipeline | undefined {
  return requests
    .map((r) => r.data)
    .filter((p): p is Pipeline => !!p)
    .find((p) => p.project.fullPath === projFullPath);
}

function NoProjectsErrorView() {
  return (
    <List>
      <ErrorView error={new NoProjectsError()} />
    </List>
  );
}
