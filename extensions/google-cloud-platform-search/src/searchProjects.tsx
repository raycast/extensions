import { ActionPanel, List, showToast, Action, Toast, Detail } from "@raycast/api";
import { fetchProjects } from "./projects";
import { Project } from "./types";
import { ProductList } from "./searchConsoleProducts";
import { useFetchWithCache } from "./useFetchWithCache";
import { sortProjectsByUsage, updateUsage } from "./usageCache";
import { useState } from "react";

const FAILURE_MESSAGE = `
# Google Cloud Platform CLI Not Configured 😞

To search projects in your organization and browse the available products, you need to:
- Install \`gcloud\` locally: https://cloud.google.com/sdk
- Save the authentication locally: \`gcloud auth application-default login\`

Your organization's project will be queried using the [Resource Manager API](https://cloud.google.com/resource-manager/docs), 
which is free and has no quota limits.
`;

export default function Command() {
  return <ProjectList />;
}

export function ProjectList() {
  const { data, error, isLoading, failureMessage } = useFetchWithCache<Project[]>("projects", fetchProjects);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not fetch updated projects, check your internet and setup the GCloud CLI!",
      message: error.message,
    });
  }

  if (failureMessage) {
    return <Detail markdown={FAILURE_MESSAGE} />;
  }

  // NB: we use manual search filtering because Raycast's native fuzzy search doesn't retain the order of the items.
  //  Sorting by usage would only work with no search text.
  const [searchText, setSearchText] = useState<string>("");
  const searchLower = searchText.toLowerCase();
  const filteredProjects = (data ?? [])?.filter((project) => {
    return project.projectId.includes(searchLower) || (project.displayName?.includes(searchLower) ?? false);
  });

  const sortedProjects = sortProjectsByUsage(filteredProjects);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search projects by name or id..."
    >
      {sortedProjects.map((project) => (
        <ProjectListItem key={project.projectId} project={project} />
      ))}
    </List>
  );
}

function ProductActions(props: { project: Project }) {
  const overviewUrl = `https://console.cloud.google.com/home/dashboard?project=${props.project.projectId}`;

  const onClickCallback = () => {
    updateUsage(props.project.projectId);
  };

  return (
    <ActionPanel title={props.project.name}>
      <Action.Push title="Search Products" target={<ProductList project={props.project} />} />
      <Action.OpenInBrowser title="Open Overview" url={overviewUrl} onOpen={onClickCallback} />
      <Action.CopyToClipboard title="Copy Project ID" content={props.project.projectId} />
    </ActionPanel>
  );
}

function ProjectListItem(props: { project: Project }) {
  return (
    <List.Item
      title={props.project.displayName ?? props.project.projectId}
      accessories={[{ text: props.project.projectId }]}
      icon="command-icon.png"
      actions={<ProductActions project={props.project} />}
    />
  );
}
