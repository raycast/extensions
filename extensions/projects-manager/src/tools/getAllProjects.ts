import { getPreferenceValues } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import Project from "../types/project";
import path from "path";
import fs from "fs";

interface ProjectWithLastOpened extends Project {
  lastOpened?: number;
}

export default async function getAllProjects(): Promise<ProjectWithLastOpened[]> {
  try {
    const storedCategories = await LocalStorage.getItem("categories");
    const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<
      string,
      number
    >;
    const projectAliases = JSON.parse((await LocalStorage.getItem("project_aliases")) || "{}") as Record<
      string,
      string[]
    >;
    const { projectsFolder } = getPreferenceValues<Preferences>();

    if (storedCategories) {
      const parsedCategories = JSON.parse(storedCategories as string);

      const allProjects: ProjectWithLastOpened[] = [];

      for (const category of parsedCategories) {
        const categoryPath = path.join(projectsFolder, category.folderName);
        if (fs.existsSync(categoryPath)) {
          const projectFolders = fs.readdirSync(categoryPath, { withFileTypes: true });

          for (const folder of projectFolders) {
            if (folder.isDirectory()) {
              const fullPath = path.join(categoryPath, folder.name);
              if (allProjects.find((p) => p.fullPath === fullPath)) {
                continue;
              }
              allProjects.push({
                name: folder.name,
                categoryName: category.name,
                fullPath: fullPath,
                lastOpened: lastOpenedTimes[fullPath] || 0,
                aliases: projectAliases[fullPath] || [],
              });
            }
          }
        }
      }

      const sortedProjects = allProjects.sort((a, b) => {
        if (a.lastOpened !== b.lastOpened) {
          return (b.lastOpened || 0) - (a.lastOpened || 0);
        }
        return a.name.localeCompare(b.name);
      });
      return sortedProjects;
    }
    return [];
  } catch (error) {
    console.error("Failed to load categories and projects:", error);
    return [];
  }
}
