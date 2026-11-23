import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { addModelToProvidersYaml } from "../config/providers-writer";

interface AddModelFormProps {
  onSaved: () => void | Promise<void>;
  onDone?: () => void;
  initialValues?: Form.Values;
  enableDrafts?: boolean;
}

interface AddModelValues extends Form.Values {
  baseUrl: string;
  apiKey: string;
  modelId: string;
}

export function AddModelForm({ onSaved, onDone, initialValues, enableDrafts }: AddModelFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<AddModelValues>({
    initialValues: {
      baseUrl: typeof initialValues?.baseUrl === "string" ? initialValues.baseUrl : "",
      apiKey: typeof initialValues?.apiKey === "string" ? initialValues.apiKey : "",
      modelId: typeof initialValues?.modelId === "string" ? initialValues.modelId : "",
    },
    validation: {
      baseUrl: FormValidation.Required,
      modelId: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        await addModelToProvidersYaml({
          baseUrl: values.baseUrl.trim(),
          apiKey: values.apiKey.trim() || undefined,
          modelId: values.modelId.trim(),
        });

        await showToast({ style: Toast.Style.Success, title: "Model added" });
        await onSaved();
        if (onDone) {
          onDone();
        } else {
          pop();
        }
        return true;
      } catch (error) {
        await showFailureToast(error, { title: "Failed to add model" });
        return false;
      }
    },
  });

  return (
    <Form
      enableDrafts={enableDrafts}
      navigationTitle="Add Model"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Model" icon={Icon.SaveDocument} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Base URL" placeholder="e.g. https://api.example.com/v1" {...itemProps.baseUrl} />
      <Form.PasswordField title="API Key" placeholder="e.g. sk-••••••••••••••••" {...itemProps.apiKey} />
      <Form.TextField title="Model ID" placeholder="e.g. your-model-id" {...itemProps.modelId} />
      <Form.Description text="Resubmit to add models from the same provider." />
      <Form.Description text="The API Key is stored in plain text in providers.yaml." />
      <Form.Description text="The original file is backed up before writing." />
    </Form>
  );
}
