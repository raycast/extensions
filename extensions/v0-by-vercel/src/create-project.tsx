import { ActionPanel, Form, Action, showToast, Toast, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import type { Project } from "./types";
import { useActiveProfile } from "./hooks/useActiveProfile";
import { v0ApiFetcher, V0ApiError } from "./lib/v0-api-utils";
import { useState } from "react";
import ViewProjectsCommand from "./view-projects";

interface CreateProjectFormValues {
  name: string;
  description?: string;
  instructions?: string;
  environmentVariables?: string;
}

interface CreateProjectCommandProps {
  onProjectCreated?: (projectId: string) => void; // Make it optional for the main command
}

export default function CreateProjectCommand(props: CreateProjectCommandProps) {
  const { push } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();

  const [environmentVariablesInput, setEnvironmentVariablesInput] = useState<string>("");

  const handleAddEnvironmentVariable = () => {
    setEnvironmentVariablesInput((prev) => prev + "\nKEY=");
  };

  const handleRemoveLastEnvironmentVariable = () => {
    const lines = environmentVariablesInput.split("\n");
    if (lines.length > 0) {
      setEnvironmentVariablesInput(lines.slice(0, lines.length - 1).join("\n"));
    }
  };

  const { handleSubmit, itemProps } = useForm<CreateProjectFormValues>({
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.", {
          title: "Project Creation Failed",
        });
        return;
      }

      if (!values.name.trim()) {
        showFailureToast("Project name cannot be empty.", { title: "Project Creation Failed" });
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating project...",
      });

      try {
        const newProject = await v0ApiFetcher<Project>("https://api.v0.dev/v1/projects", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": activeProfileDefaultScope || "",
          },
          body: {
            name: values.name,
            description: values.description,
            ...(values.instructions && { instructions: values.instructions }),
            ...(environmentVariablesInput.length > 0 && {
              environmentVariables: environmentVariablesInput
                .split("\n")
                .filter((line) => line.includes("="))
                .map((line) => {
                  const [key, value] = line.split(/=(.*)/s);
                  return { key, value };
                }),
            }),
          },
        });

        toast.style = Toast.Style.Success;
        toast.title = "Project Created";
        toast.message = `Project "${newProject.name}" created successfully!`;

        if (props.onProjectCreated) {
          props.onProjectCreated(newProject.id);
        }
        push(<ViewProjectsCommand />); // Navigate to view-projects.tsx
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Project Creation Failed" });
        } else {
          showFailureToast(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`, {
            title: "Project Creation Failed",
          });
        }
      }
    },
    validation: {
      name: (value) => {
        if (!value || value.length === 0) {
          return "Project name is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} icon={Icon.PlusCircle} />
          <Action
            title="Add Environment Variable"
            onAction={handleAddEnvironmentVariable}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
          />
          <Action
            title="Remove Last Environment Variable"
            onAction={handleRemoveLastEnvironmentVariable}
            icon={Icon.Minus}
            shortcut={Keyboard.Shortcut.Common.Remove}
          />
        </ActionPanel>
      }
      isLoading={isLoadingProfileDetails}
    >
      <Form.TextField title="Project Name" placeholder="e.g., My New Awesome Project" {...itemProps.name} />
      <Form.TextArea title="Description" placeholder="Brief description of the project" {...itemProps.description} />
      <Form.TextArea title="Instructions" placeholder="Detailed guidance for the project" {...itemProps.instructions} />

      <Form.TextArea
        title="Environment Variables"
        placeholder="KEY1=VALUE1\nKEY2=VALUE2"
        info="Enter environment variables as KEY=VALUE pairs, one per line."
        value={environmentVariablesInput}
        onChange={setEnvironmentVariablesInput}
        id="environmentVariables"
      />
    </Form>
  );
}
