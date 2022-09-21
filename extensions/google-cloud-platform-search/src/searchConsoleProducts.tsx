import { ConsoleProduct, Project } from "./types";
import { ActionPanel, List, Action, showToast, Toast, Clipboard } from "@raycast/api";
import { consoleProducts } from "./consoleProducts";
import { useCachedPromise } from "@raycast/utils";
import * as React from "react";
import { ProjectsClient } from "@google-cloud/resource-manager";

const client = new ProjectsClient();

export async function fetchProjects() {
  const projects: Project[] = [];
  for await (const project of client.searchProjectsAsync()) {
    if (project.name && project.projectId) {
      projects.push(project as Project);
    }
  }

  return Object.fromEntries(
    projects.sort((a, b) => a.projectId.localeCompare(b.projectId)).map((project) => [project.projectId, project])
  );
}

export default function ProductList() {
  const { data: projects, isLoading } = useCachedPromise(fetchProjects, [], {
    onError: (error) => {
      showToast({
        title: "Could not fetch updated projects.",
        style: Toast.Style.Failure,
        message: "Run `gcloud auth application-default login` to configure the Google Cloud Platform CLI.",
        primaryAction: {
          title: "Copy Error",
          onAction: () => Clipboard.copy(error.message),
        },
      });
    },
  });

  const [selectedProject, setSelectedProject] = React.useState<Project>();

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        projects ? (
          <List.Dropdown tooltip="Project" storeValue onChange={(projectId) => setSelectedProject(projects[projectId])}>
            {Object.keys(projects).map((projectId) => (
              <List.Dropdown.Item key={projectId} value={projectId} title={projectId} />
            ))}
          </List.Dropdown>
        ) : null
      }
      searchBarPlaceholder={`Search products...`}
    >
      {selectedProject
        ? consoleProducts.map((product) => (
            <ProjectListItem key={product.name} product={product} project={selectedProject} />
          ))
        : null}
    </List>
  );
}

function ProjectListItem(props: { product: ConsoleProduct; project: Project }) {
  const productUrl = props.product.toUrl(props.project.projectId);
  const overviewUrl = `https://console.cloud.google.com/home/dashboard?project=${props.project.projectId}`;
  return (
    <List.Item
      title={props.product.name}
      icon="command-icon.png"
      actions={
        <ActionPanel title={props.product.name}>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={productUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open Overview" url={overviewUrl} />
            <Action.CopyToClipboard title="Copy Project ID" content={props.project.projectId} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        {
          text: props.project.displayName,
        },
      ]}
    />
  );
}
