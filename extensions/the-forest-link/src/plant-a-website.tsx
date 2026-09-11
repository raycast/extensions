import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useForm } from "@raycast/utils";

import { normalizeWebsiteUrl, plantWebsite } from "./the-forest";

interface FormValues {
  website: string;
}

function validateWebsite(value: string | undefined) {
  if (!value) {
    return "Enter a website address";
  }

  try {
    normalizeWebsiteUrl(value);
  } catch {
    return "Enter a valid website address, including https://";
  }

  return undefined;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    validation: { website: validateWebsite },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Planting website…" });

      try {
        await plantWebsite(normalizeWebsiteUrl(values.website));
        toast.style = Toast.Style.Success;
        toast.title = "Website planted";
        toast.message = "Maybe it will sprout, maybe it won't.";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not plant website";
        toast.message = error instanceof Error ? error.message : "An unknown error occurred";
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Plant Website" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Plant a tree and help grow The Forest. Submissions may be reviewed before they appear." />
      <Form.TextField
        title="Website"
        placeholder="https://youareaweso.me"
        info="Include the full address, starting with http:// or https://"
        {...itemProps.website}
      />
    </Form>
  );
}
