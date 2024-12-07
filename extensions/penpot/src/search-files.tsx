import { ActionPanel, Action, Icon, List } from "@raycast/api";
import type { Project, ProjectFile } from "../types";
import { formatDate, usePenpotFetch } from "../utils";
import { useEffect, useState } from "react";
import FileThumbnail from "./file-thumbnail";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [filteredFiles, filterFiles] = useState<ProjectFile[]>([]);

  const { data: projects, isLoading: isLoadingProjects } = usePenpotFetch<Project[]>(`/get-all-projects`);
  const {
    data: files,
    isLoading: isLoadingFiles,
    revalidate: revalidateFiles,
  } = usePenpotFetch<ProjectFile[]>(`/get-project-files?project-id=${selectedProjectId}`);

  useEffect(() => {
    filterFiles((files || []).filter((file) => file.name.toLowerCase().includes(searchText.toLowerCase())));
  }, [searchText, files]);

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoadingProjects || isLoadingFiles}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Projects"
          placeholder="Search projects"
          isLoading={isLoadingProjects}
          storeValue={true}
          onChange={setSelectedProjectId}
        >
          {(projects || []).map((project) => (
            <List.Dropdown.Item key={project.id} title={project.name} value={project.id} />
          ))}
        </List.Dropdown>
      }
      searchBarPlaceholder="Filter files by name"
      actions={
        <ActionPanel>
          <Action
            icon={Icon.ArrowClockwise}
            title="Refresh"
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidateFiles}
          />
        </ActionPanel>
      }
    >
      {filteredFiles.map((file) => {
        const url = `https://design.penpot.app/?_gl=#/workspace/${file.projectId}/${file.id}`;

        return (
          <List.Item
            key={file.id}
            icon={file.isShared ? Icon.Person : Icon.Document}
            title={file.name}
            subtitle={`Modified ${formatDate(file.modifiedAt)}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={url} />
                <Action.CopyToClipboard content={url} />
                <Action.Push
                  title="Show Details"
                  target={<FileThumbnail file={file} />}
                  icon={Icon.Image}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
