import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import type { Link } from "../types";
import { updateLink } from "../services/api";
import { urlValidation } from "../services/validation";

interface LinkDetailProps {
  link: Link;
  onRefresh: () => void;
}

interface FormValues {
  url: string;
  is_enabled: boolean;
  description?: string;
}

export const LinkDetail = ({ link, onRefresh }: LinkDetailProps) => {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: {
      url: (value) => {
        const result = urlValidation.format(value);
        if (!result.isValid) return result.message;
      },
    },
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Updating link...",
      });

      try {
        await updateLink(link.short_code, {
          url: values.url,
          is_enabled: values.is_enabled ? 1 : 0,
          description: values.description || null,
        });

        toast.style = Toast.Style.Success;
        toast.title = "Link updated successfully";

        onRefresh(); // Refetch the links list after update
        pop(); // Go back to the previous screen after successful update
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update link" });
      }
    },
    // Use the values from the incoming link object as the initial values for the form
    initialValues: {
      url: link.original_url, // Use the original URL
      is_enabled: link.is_enabled === 1, // Convert number to boolean
      description: link.description || "", // Use an empty string if description is null
    },
  });

  return (
    <Form
      navigationTitle="Edit Link"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Slug" text={link.short_code} />
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://a-very-long-url.com" />
      <Form.Checkbox {...itemProps.is_enabled} title="Status" label="Enable this link" />
      <Form.TextField {...itemProps.description} title="Description" placeholder="Optional description for this link" />
    </Form>
  );
};
