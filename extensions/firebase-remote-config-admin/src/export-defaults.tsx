import { Action, ActionPanel, Clipboard, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import ManageProjectsCommand from "./manage-projects";
import { downloadRemoteConfigDefaults } from "./remote-config-client";
import { getProjects } from "./storage";

async function loadProjects() {
  return (await getProjects()).filter((project) => project.enabled);
}

export default function ExportDefaultsCommand() {
  const { data: projects, isLoading } = useCachedPromise(loadProjects, [], {
    keepPreviousData: true,
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [format, setFormat] = useState<"JSON" | "PLIST" | "XML">("JSON");

  const selectedProject = projects?.find(
    (project) => project.id === (selectedProjectId || projects?.[0]?.id),
  );
  const { data: content, isLoading: contentLoading } = useCachedPromise(
    async (
      projectId: string | undefined,
      selectedFormat: "JSON" | "PLIST" | "XML",
    ) => {
      const project = (projects ?? []).find((entry) => entry.id === projectId);
      if (!project) return "";
      return downloadRemoteConfigDefaults(project, selectedFormat);
    },
    [selectedProject?.id, format],
    {
      execute: Boolean(selectedProject),
      keepPreviousData: true,
    },
  );

  if (!isLoading && (!projects || projects.length === 0)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.PlusCircle}
          title="No Firebase projects"
          description="Add a Firebase project first. Open Manage Projects to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Projects"
                icon={Icon.Gear}
                target={<ManageProjectsCommand />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading || contentLoading}
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown
          tooltip="Project"
          value={selectedProject?.id || ""}
          onChange={setSelectedProjectId}
          storeValue
        >
          {(projects ?? []).map((project) => (
            <List.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.displayName}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Defaults" subtitle={`Format: ${format}`}>
        <List.Item
          title={selectedProject?.displayName ?? "No Project"}
          subtitle={`Format: ${format}`}
          detail={
            <List.Item.Detail
              markdown={`\`\`\`${format.toLowerCase()}\n${content ?? ""}\n\`\`\``}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Use JSON"
                icon={Icon.Document}
                onAction={() => setFormat("JSON")}
              />
              <Action
                title="Use PLIST"
                icon={Icon.Document}
                onAction={() => setFormat("PLIST")}
              />
              <Action
                title="Use XML"
                icon={Icon.Document}
                onAction={() => setFormat("XML")}
              />
              <Action
                title="Copy Defaults"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(content ?? "");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
