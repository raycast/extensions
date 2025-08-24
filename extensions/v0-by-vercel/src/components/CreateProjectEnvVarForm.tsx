import { Action, ActionPanel, Form, Icon, Toast, showToast, Keyboard } from "@raycast/api";
import { useForm, showFailureToast, FormValidation } from "@raycast/utils";
import { useNavigation } from "@raycast/api";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { v0ApiFetcher, V0ApiError } from "../lib/v0-api-utils";
import { useState } from "react";

interface CreateProjectEnvVarFormProps {
  projectId: string;
  onCreated?: () => void;
  existingEnvVar?: {
    id: string;
    key: string;
    value?: string;
  };
}

interface CreateEnvVarFormValues {
  key: string;
  value: string;
}

export default function CreateProjectEnvVarForm({
  projectId,
  onCreated,
  existingEnvVar,
}: CreateProjectEnvVarFormProps) {
  const { pop } = useNavigation();
  const { activeProfileApiKey, isLoadingProfileDetails, activeProfileDefaultScope } = useActiveProfile();
  const [showValue, setShowValue] = useState<boolean>(false);

  const { handleSubmit, itemProps, values } = useForm<CreateEnvVarFormValues>({
    onSubmit: async (values) => {
      if (!activeProfileApiKey) {
        showFailureToast("API Key not available. Please set it in Preferences or manage profiles.");
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: existingEnvVar ? "Updating environment variable..." : "Adding environment variable...",
      });

      try {
        if (existingEnvVar?.id) {
          await v0ApiFetcher(`https://api.v0.dev/v1/projects/${projectId}/env-vars`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${activeProfileApiKey}`,
              "Content-Type": "application/json",
              "x-scope": activeProfileDefaultScope || "",
            },
            body: {
              environmentVariables: [
                {
                  id: existingEnvVar.id,
                  value: values.value,
                },
              ],
            },
          });

          toast.style = Toast.Style.Success;
          toast.title = "Environment Variable Updated";
          toast.message = `${existingEnvVar.key} updated`;
        } else {
          await v0ApiFetcher(`https://api.v0.dev/v1/projects/${projectId}/env-vars`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${activeProfileApiKey}`,
              "Content-Type": "application/json",
              "x-scope": activeProfileDefaultScope || "",
            },
            body: {
              environmentVariables: [
                {
                  key: values.key,
                  value: values.value,
                },
              ],
            },
          });

          toast.style = Toast.Style.Success;
          toast.title = "Environment Variable Added";
          toast.message = `${values.key} created`;
        }
        onCreated?.();
        pop();
      } catch (error) {
        if (error instanceof V0ApiError) {
          showFailureToast(error.message, { title: "Creation Failed" });
        } else {
          showFailureToast(
            `Failed to add environment variable: ${error instanceof Error ? error.message : String(error)}`,
            { title: "Creation Failed" },
          );
        }
      }
    },
    validation: {
      key: (val) => {
        if (!existingEnvVar && !val) return "Key is required";
      },
      value: FormValidation.Required,
    },
    initialValues: existingEnvVar
      ? {
          key: existingEnvVar.key,
          value: existingEnvVar.value || "",
        }
      : undefined,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={existingEnvVar ? "Update Environment Variable" : "Add Environment Variable"}
            onSubmit={handleSubmit}
            icon={existingEnvVar ? Icon.Pencil : Icon.PlusCircle}
          />
          <Action
            title={showValue ? "Hide Value" : "Show Value"}
            icon={Icon.Eye}
            onAction={() => setShowValue((s: boolean) => !s)}
            shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
          />
        </ActionPanel>
      }
      isLoading={isLoadingProfileDetails}
    >
      {existingEnvVar ? (
        <Form.Description title="Key" text={values.key || existingEnvVar.key} />
      ) : (
        <Form.TextField title="Key" placeholder="e.g. DATABASE_URL" {...itemProps.key} />
      )}
      {showValue ? (
        <Form.TextArea title="Value" placeholder="Enter secret value" {...itemProps.value} />
      ) : (
        <Form.PasswordField title="Value" placeholder="Enter secret value" {...itemProps.value} />
      )}
    </Form>
  );
}
