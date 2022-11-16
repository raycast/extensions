import {
  ActionPanel,
  CopyToClipboardAction,
  PushAction,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { fetchProjects } from "./projects";
import { Project } from "./types";
import { ProductList } from "./searchConsoleProducts";
import { useFetchWithCache } from "./useFetchWithCache";
import { Detail } from "@raycast/api";

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
    showToast(
      ToastStyle.Failure,
      "Could not fetch updated projects, check your internet and setup the GCloud CLI!",
      error.message
    );
  }

  if (failureMessage) {
    return <Detail markdown={FAILURE_MESSAGE} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search projects by name...">
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
