import { ActionPanel, Form, Action, showToast, Toast, Icon, List } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useProjects } from "../hooks/useProjects";
import { useState, useEffect } from "react";
import type { ChatSummary, AssignProjectResponse } from "../types";
import CreateProjectForm from "./CreateProjectForm";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";

interface AssignProjectFormProps {
  chat: ChatSummary;
  revalidateChats: () => void;
}

export default function AssignProjectForm({ chat, revalidateChats }: AssignProjectFormProps) {
  const { pop } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();

  const { projects, isLoadingProjects, projectError, revalidateProjects } = useProjects(activeProfileDefaultScope);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Only update selectedProjectId after projects and profile details have loaded
    if (!isLoadingProjects && !isLoadingProfileDetails && projects) {
      if (chat.projectId && projects.some((p) => p.id === chat.projectId)) {
        setSelectedProjectId(chat.projectId);
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].id);
      } else {
        // If no projects are found after loading, clear selected project
        setSelectedProjectId(null);
      }
    }
  }, [chat.projectId, projects, isLoadingProjects, isLoadingProfileDetails]);

  const assignProject = async (projectIdToAssign: string) => {
    if (!activeProfileApiKey) {
      showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
        title: "Assignment Failed",
      });
      return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Assigning project...",
    });

    try {
      const result = await v0ApiFetcher<AssignProjectResponse>(
        `https://api.v0.dev/v1/projects/${projectIdToAssign}/assign`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "x-scope": activeProfileDefaultScope || "",
            "Content-Type": "application/json",
          },
          body: { chatId: chat.id },
        },
      );

      if (result.assigned) {
        toast.style = Toast.Style.Success;
        toast.title = "Project Assigned";
        toast.message = `Project successfully assigned to "${chat.name || "Untitled Chat"}".`;
        revalidateChats(); // Revalidate chats to show the assigned project
        pop(); // Go back to the chat list
      } else {
        throw new Error("Project assignment failed.");
      }
    } catch (error) {
      if (error instanceof V0ApiError) {
        showFailureToast(error.message, { title: "Assignment Failed" });
      } else {
        showFailureToast(`Failed to assign project: ${error instanceof Error ? error.message : String(error)}`, {
          title: "Assignment Failed",
        });
      }
    }
  };

  const handleSubmit = () => {
    if (selectedProjectId) {
      assignProject(selectedProjectId);
    } else {
      showFailureToast("Please select a project.");
    }
  };

  const handleNewProjectCreated = (newProjectId: string) => {
    revalidateProjects(); // Refresh the list of projects
    assignProject(newProjectId); // Automatically assign the new project to the chat
  };

  if (projectError) {
    return (
      <Form>
        <Form.Description title="Error" text={`Failed to load projects: ${projectError.message}`} />
      </Form>
    );
  }

  if (isLoadingProjects || isLoadingProfileDetails) {
    return (
      <List navigationTitle="Assign Project">
        <List.EmptyView title="Loading projects..." description="Fetching available projects..." />
      </List>
    );
  }

  // If no projects are loaded after fetching, directly push to CreateProjectForm
  if (projects.length === 0 && !isLoadingProjects && !isLoadingProfileDetails) {
    showFailureToast("No projects found. Please create a new project to assign to this chat.");
    return <CreateProjectForm onProjectCreated={handleNewProjectCreated} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Assign Selected Project" onSubmit={handleSubmit} icon={Icon.Tag} />
          <Action.Push
            title="Create New Project"
            icon={Icon.PlusCircle}
            target={<CreateProjectForm onProjectCreated={handleNewProjectCreated} />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="projectId"
        title="Select Project"
        value={selectedProjectId || ""}
        onChange={setSelectedProjectId}
        isLoading={isLoadingProjects}
      >
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
