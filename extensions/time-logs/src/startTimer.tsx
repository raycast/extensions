// commands/trackTime.tsx
import { useEffect } from "react";
import { showToast, Toast, popToRoot, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { TimeEntry, Project } from "./models";
import { saveTimeEntry, stopActiveTimer, getProjects, saveProject } from "./storage";
import { generateId } from "./utils";

// Define the command arguments
export interface TrackTimeArguments {
  project?: string;
  description: string; // Required field
}

// Define a random color function for new projects
function getRandomColor(): string {
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#FF33A8",
    "#33A8FF",
    "#FF5733",
    "#FFC300",
    "#33FFC3",
    "#C333FF",
    "#FF3333",
    "#33FF33",
    "#3333FF",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

export default function TrackTime(props: { arguments: TrackTimeArguments }) {
  // Extract arguments - handle possibly undefined arguments more gracefully
  const { project: projectInput, description } = props.arguments || { project: undefined, description: undefined };

  // When component loads, start timer with the provided arguments
  useEffect(() => {
    startTimerWithArguments(projectInput, description);
  }, [projectInput, description]);

  // Start a timer with the provided project input and description
  async function startTimerWithArguments(projectInput?: string, description?: string) {
    try {
      // Find project by input (index, partial name, or ID)
      let projectId: string | undefined;
      let projectText = "";

      if (projectInput && projectInput.trim() !== "") {
        const projects = await getProjects();
        let matchingProject: Project | undefined;

        // Check if input is a number (index in the list)
        const projectIndex = parseInt(projectInput);
        if (!isNaN(projectIndex) && projectIndex > 0 && projectIndex <= projects.length) {
          // Convert from 1-based indexing to 0-based
          matchingProject = projects[projectIndex - 1];
        } else {
          // Try to match by name or ID
          matchingProject = projects.find(
            (p) =>
              p.id === projectInput ||
              p.name.toLowerCase() === projectInput.toLowerCase() ||
              p.name.toLowerCase().includes(projectInput.toLowerCase()),
          );
        }

        if (matchingProject) {
          projectId = matchingProject.id;
          projectText = matchingProject.name;
        } else {
          // If a project list is requested, show all available projects
          if (projectInput.toLowerCase() === "list" || projectInput === "?") {
            let projectList = "Available projects:\n";
            projects.forEach((p, index) => {
              projectList += `${index + 1}. ${p.name}\n`;
            });

            await showToast({
              style: Toast.Style.Success,
              title: "Projects:",
              message: projectList,
            });
            popToRoot();
            return;
          }

          // Auto-create a new project with the provided name
          const newProject: Project = {
            id: generateId(),
            name: projectInput.trim(),
            color: getRandomColor(),
            createdAt: new Date().toISOString(),
          };

          await saveProject(newProject);
          projectId = newProject.id;
          projectText = newProject.name;

          // Inform the user that a new project was created
          await showToast({
            style: Toast.Style.Success,
            title: "New Project Created",
            message: `Created new project "${projectInput}"`,
          });
        }
      }

      // Stop any active timer first
      await stopActiveTimer();

      // Create new timer
      const newEntry: TimeEntry = {
        id: generateId(),
        description: description ? description.trim() : "",
        startTime: new Date(),
        endTime: null,
        isActive: true,
        createdAt: new Date().toISOString(),
        projectId: projectId,
      };

      await saveTimeEntry(newEntry);

      // Refresh the menu bar timer first (this will show "Menu Bar item refreshed")
      try {
        await launchCommand({ name: "menuBarTimer", type: LaunchType.UserInitiated });
      } catch (error) {
        console.error("Failed to refresh menu bar timer:", error);
      }

      // Use Toast notification instead of HUD, with everything in the title
      await showToast({
        style: Toast.Style.Success,
        title: `${projectText ? projectText + " — " : ""}${description ? description : ""} timer started`,
      });

      // Close Raycast
      popToRoot();
    } catch (error) {
      console.error("Error starting timer:", error);
      showFailureToast(error, { title: "Failed to start timer" });
      popToRoot();
    }
  }

  // No UI is rendered - everything happens in the useEffect
  return null;
}
