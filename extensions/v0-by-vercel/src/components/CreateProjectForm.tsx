import { ActionPanel, Form, Action, showToast, Toast, Icon } from "@raycast/api";
import { useNavigation } from "@raycast/api";
import type { CreateProjectResponse } from "../types";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useForm, FormValidation, showFailureToast } from "@raycast/utils"; // Import useForm, FormValidation, and showFailureToast
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";

interface CreateProjectFormProps {
  onProjectCreated: (projectId: string) => void;
}

interface CreateProjectFormValues {
  name: string;
  description?: string;
}

export default function CreateProjectForm({ onProjectCreated }: CreateProjectFormProps) {
  const { pop } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();

  const { handleSubmit, itemProps } = useForm<CreateProjectFormValues>({
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.");
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating project...",
      });

      try {
        const newProject = await v0ApiFetcher<CreateProjectResponse>("https://api.v0.dev/v1/projects", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${activeProfileApiKey}`,
            "Content-Type": "application/json",
            "x-scope": activeProfileDefaultScope || "",
          },
          body: { name: values.name, description: values.description },
        });

        toast.style = Toast.Style.Success;
        toast.title = "Project Created";
        toast.message = `Project "${newProject.name}" created successfully.`;
        onProjectCreated(newProject.id);
        pop(); // Go back to the previous form (AssignProjectForm)
      } catch (error) {
        showFailureToast({
          title: "Creation Failed",
          message:
            error instanceof V0ApiError
              ? error.message
              : `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Project" onSubmit={handleSubmit} icon={Icon.PlusCircle} />
        </ActionPanel>
      }
      isLoading={isLoadingProfileDetails}
    >
      <Form.TextField title="Project Name" placeholder="Enter project name" {...itemProps.name} />
      <Form.TextArea
        title="Project Description (Optional)"
        placeholder="Enter project description"
        {...itemProps.description}
      />
    </Form>
  );
}
