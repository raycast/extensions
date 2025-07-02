import { List, ActionPanel, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import getAllProjects from "./tools/getAllProjects";
import getReleases from "./tools/getReleases";
import Project from "./types/project";
import Release from "./types/release";
import { Detail } from "@raycast/api";
import ReleaseEntry from "./types/releaseEntry";
import { LocalStorage } from "@raycast/api";

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>();
  const [releaseEntries, setReleaseEntries] = useState<ReleaseEntry[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      const projects = await getAllProjects();
      setProjects(projects);

      // Get last opened times
      const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<
        string,
        number
      >;

      // Find most recently opened project
      const mostRecentProject = projects.reduce(
        (recent, project) => {
          const lastOpened = lastOpenedTimes[project.fullPath] || 0;
          if (!recent || lastOpened > lastOpenedTimes[recent.fullPath] || 0) {
            return project;
          }
          return recent;
        },
        null as Project | null,
      );

      if (mostRecentProject) {
        setSelectedProject(mostRecentProject.name);
        await loadReleases(mostRecentProject.name);
      }

      setLoading(false);
    };

    initializeData();
  }, []);

  useEffect(() => {
    const loadReleaseEntries = async () => {
      const entries = await LocalStorage.getItem<string>("releaseEntries");
      if (entries) {
        setReleaseEntries(JSON.parse(entries));
      }
    };
    loadReleaseEntries();
  }, []);

  const loadReleases = async (projectName: string) => {
    setLoading(true);
    const projectReleases = await getReleases({ projectName });
    setReleases(projectReleases);
    setSelectedProject(projectName);
    setLoading(false);
  };

  const getReleaseMarkdown = (release: Release) => {
    let markdown = `# What's new in v${release.version}\n\n`;
    const entries = releaseEntries.filter(
      (entry) => entry.releaseID === release.id && entry.projectID === selectedProject,
    );
    console.log(entries);
    if (entries.length > 0) {
      const additionEntries = entries.filter((entry) => entry.entryType === "Addition");
      const improvementEntries = entries.filter((entry) => entry.entryType === "Improvement");
      const bugfixEntries = entries.filter((entry) => entry.entryType === "Bug Fix");

      if (additionEntries.length > 0) {
        markdown += "\n## ✨ New\n\n";
        additionEntries.forEach((entry) => {
          markdown += `- ${entry.description}\n`;
        });
      }

      if (improvementEntries.length > 0) {
        markdown += "\n## 💎 Improvements\n\n";
        improvementEntries.forEach((entry) => {
          markdown += `- ${entry.description}\n`;
        });
      }

      if (bugfixEntries.length > 0) {
        markdown += "\n## 🐞 Fixes\n\n";
        bugfixEntries.forEach((entry) => {
          markdown += `- ${entry.description}\n`;
        });
      }
    } else {
      markdown += "No release notes available.";
    }

    return markdown;
  };

  return (
    <List
      isLoading={loading}
      navigationTitle="Search Releases"
      searchBarPlaceholder="Search releases by project..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select Project" value={selectedProject} onChange={loadReleases}>
          {projects.map((project) => (
            <List.Dropdown.Item
              key={project.categoryName + "-" + project.name}
              title={project.name}
              value={project.name}
            />
          ))}
        </List.Dropdown>
      }
    >
      {releases.map((release) => (
        <List.Item
          key={release.id}
          title={`Version v${release.version}`}
          subtitle={release.released ? "Released" : "Unreleased"}
          actions={
            <ActionPanel>
              <Action.Push title="View Release Notes" target={<Detail markdown={getReleaseMarkdown(release)} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
