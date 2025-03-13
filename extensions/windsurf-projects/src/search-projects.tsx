import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { homedir } from "os";

interface Project {
  name: string;
  rootPath: string;
  paths: string[];
  tags: string[];
  enabled: boolean;
}

export default function Command() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsFilePath = path.join(
        homedir(),
        "Library/Application Support/Windsurf/User/globalStorage/alefragnani.project-manager/projects.json",
      );

      if (fs.existsSync(projectsFilePath)) {
        const projectsData = fs.readFileSync(projectsFilePath, "utf-8");
        const parsedProjects = JSON.parse(projectsData) as Project[];
        setProjects(parsedProjects);
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Projects file not found",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to load projects: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openProject = async (project: Project) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening project",
        message: project.name,
      });

      exec(`open -a Windsurf "${project.rootPath}"`, async (error) => {
        if (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: `Failed to open project: ${error.message}`,
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: `Opened ${project.name}`,
          });
        }
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to open project: ${error}`,
      });
    }
  };

  const openFinder = async (project: Project) => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Opening in Finder",
        message: project.rootPath,
      });

      exec(`open "${project.rootPath}"`, async (error) => {
        if (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Error",
            message: `Failed to open in Finder: ${error.message}`,
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "Success",
            message: `Opened ${project.name} in Finder`,
          });
        }
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to open in Finder: ${error}`,
      });
    }
  };

  return (
    <List isLoading={isLoading}>
      {projects.map((project) => (
        <List.Item
          key={project.name}
          icon={Icon.Code}
          title={project.name}
          subtitle={project.rootPath}
          actions={
            <ActionPanel>
              <Action title="Open in Windsurf" onAction={() => openProject(project)} />
              <Action title="Open in Finder" icon={Icon.Finder} onAction={() => openFinder(project)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
