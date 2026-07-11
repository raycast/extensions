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
import { useEffect } from "react";

import { createLink } from "./lib/api";
import { useActiveTab } from "./lib/use-active-tab";

interface LinkFormValues {
  url: string;
  note: string;
}

export default function Command() {
  const { url: activeUrl, isLoading } = useActiveTab();

  const { handleSubmit, itemProps, setValue } = useForm<LinkFormValues>({
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

  // Auto-fill URL from active browser tab
  useEffect(() => {
    if (activeUrl) {
      setValue("url", activeUrl);
    }
  }, [activeUrl]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Link" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.url}
        title="URL"
        placeholder={isLoading ? "Loading from browser..." : "https://..."}
        autoFocus={false}
      />
      <Form.TextArea
        {...itemProps.note}
        title="Note"
        placeholder="Add a note (optional)"
        autoFocus
      />
    </Form>
  );
}
