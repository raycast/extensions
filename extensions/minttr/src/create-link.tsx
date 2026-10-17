import {
  Action,
  ActionPanel,
  Form,
  PopToRootType,
  Toast,
  showHUD,
  showToast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";

import { createLink } from "./lib/api";

interface LinkFormValues {
  url: string;
  note: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<LinkFormValues>({
    async onSubmit(values) {
      await showToast({ title: "Saving link...", style: Toast.Style.Animated });

      const result = await createLink({
        url: values.url,
        note: values.note || undefined,
      });

      if (!result.success) {
        await showToast({
          title: "Failed to save link",
          message: result.error,
          style: Toast.Style.Failure,
        });
        return;
      }

      await showHUD("Link saved", { popToRootType: PopToRootType.Immediate });
    },
    validation: {
      url: FormValidation.Required,
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
      <Form.TextField {...itemProps.url} title="URL" placeholder="https://" />
      <Form.TextArea
        {...itemProps.note}
        title="Note"
        placeholder="Write a note (optional)"
      />
    </Form>
  );
}
