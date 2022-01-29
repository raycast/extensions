import {
  ActionPanel,
  CopyToClipboardAction,
  PushAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useProjects } from "./projects";
import { Project } from "./types";
import { ProductList } from "./searchConsoleProducts";
import { SWRConfig } from "swr";
import { cacheConfig } from "./swrCache";

export default function Command() {
  return (
    <SWRConfig value={cacheConfig}>
      <ProjectList />
    </SWRConfig>
  );
}

export function ProjectList() {
  const { data, error, isValidating } = useProjects();

  if (error) {
    showToast(
      ToastStyle.Failure,
      "Could not fetch updated projects, make sure to follow the instructions!",
      error.message
    );
  }

  return (
    <List isLoading={isValidating} searchBarPlaceholder="Search projects by name...">
      {data?.map((project) => (
        <ProjectListItem key={project.projectId} project={project} />
      ))}
    </List>
  );
}

function ProductActions(props: { project: Project }) {
  const overviewUrl = `https://console.cloud.google.com/home/dashboard?project=${props.project.projectId}`;

  return (
    <ActionPanel title={props.project.name}>
      <PushAction title="Search Products" target={<ProductList project={props.project} />} />
      <OpenInBrowserAction title="Open Overview" url={overviewUrl} />
      <CopyToClipboardAction title="Copy Project ID" content={props.project.projectId} />
    </ActionPanel>
  );
}

function ProjectListItem(props: { project: Project }) {
  return (
    <List.Item
      title={props.project.displayName ?? props.project.projectId}
      accessoryTitle={props.project.projectId}
      icon="command-icon.png"
      actions={<ProductActions project={props.project} />}
    />
  );
}
