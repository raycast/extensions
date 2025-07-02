import { LocalStorage, WindowManagement } from "@raycast/api";
import getAllProjects from "../tools/getAllProjects";
import Project from "../types/project";
import { runAppleScript } from "@raycast/utils";

export default async function getFrontMostProject() {
  const activeWindow = await WindowManagement.getActiveWindow();
  const appName = activeWindow.application?.name;
  console.log(appName);
  const script = `
    tell application "System Events"
      set frontAppProcess to first application process whose frontmost is true
      tell frontAppProcess
        if count of windows > 0 then
          set window_name to name of front window
          return window_name
        end if
      end tell
    end tell
  `;

  const windowName = await runAppleScript(script);
  let repoName = "";
  if (appName === "Cursor") {
    console.log(windowName);
    const split = windowName.split(" — ");
    console.log(split.length);
    if (split.length == 2) {
      repoName = split[0];
    } else if (split.length == 3) {
      repoName = split[1];
    }
  } else if (appName === "Xcode") {
    console.log(windowName);
    const split = windowName.split(" — ");
    const schemeName = split[0];
    console.log(schemeName);
    repoName = schemeName;
  }

  if (repoName !== "") {
    const allProjects = await getAllProjects();
    const project = allProjects.filter((project) => project.name === repoName || project.aliases?.includes(repoName));
    if (project.length == 1) {
      return project[0] as Project;
    } else if (project.length > 1) {
      // Get application path from active window
      const appPath = activeWindow.application?.path;
      if (appPath) {
        // Find projects that match the app path category
        const matchingProjects = project.filter((p) => {
          // Check if project category path matches app path
          return appPath.toLowerCase().includes(p.categoryName.toLowerCase());
        });

        if (matchingProjects.length === 1) {
          return matchingProjects[0];
        }
      }
      console.log("Multiple projects found for " + repoName);
    } else {
      // Get last opened times from LocalStorage
      const lastOpenedTimes = JSON.parse((await LocalStorage.getItem("lastOpenedTimes")) || "{}") as Record<
        string,
        number
      >;

      // Find most recently opened project
      const mostRecentProject = allProjects.reduce(
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
        return mostRecentProject;
      }
    }
  }
}
