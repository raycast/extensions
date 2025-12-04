import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { ProjectLink } from "../types";
import { addLink, updateLink } from "../utils/storage";
import { showFailureToast, useForm, FormValidation } from "@raycast/utils";

interface LinkFormProps {
  projectId: string;
  link?: ProjectLink;
  onSave?: () => void;
}

interface FormValues {
  title: string;
  url: string;
}

export function LinkForm({ projectId, link, onSave }: LinkFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<FormValues>({
    onSubmit: async (values) => {
      try {
        const trimmedUrl = values.url.trim();
        try {
          new URL(trimmedUrl);
        } catch {
          throw new Error("Please enter a valid URL");
        }

        if (link) {
          await updateLink({
            ...link,
            title: values.title.trim(),
            url: trimmedUrl,
          });
        } else {
          await addLink({
            projectId,
            title: values.title.trim(),
            url: trimmedUrl,
          });
        }
        onSave?.();
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Could not save link" });
      }
    },
    validation: {
      title: FormValidation.Required,
      url: (value) => {
        if (!value) {
          return "URL is required";
        }
        try {
          new URL(value.trim());
        } catch {
          return "Please enter a valid URL";
        }
      },
    },
    initialValues: {
      title: link?.title ?? "",
      url: link?.url ?? "",
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="Enter link title" autoFocus />
      <Form.TextField {...itemProps.url} title="URL" placeholder="Enter link URL" />
    </Form>
  );
}
