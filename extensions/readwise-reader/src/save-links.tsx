import { Action, ActionPanel, Form, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

import { handleSaveURLs } from "./utils/handleSave";
import { extractURLs } from "./utils/url";

interface SaveArguments {
  urls: string;
  author?: string;
  tags?: string;
}

const rateLimit = 20;
function savingToast(urls: string) {
  const urlList = extractURLs(urls);

  const title = urlList.length > rateLimit ? "Saving to Readwise...(may take a few minutes)" : "Saving to Readwise...";
  return new Toast({
    style: Toast.Style.Animated,
    title,
  });
}

export default function Command() {
  const [loading, setLoading] = useState(false);
  const { handleSubmit, itemProps, reset } = useForm<SaveArguments>({
    async onSubmit(values) {
      if (loading) {
        return;
      }

      setLoading(true);
      const toast = savingToast(values.urls);
      await toast.show();
      try {
        await handleSaveURLs(values.urls, values.author, values.tags);
        toast.style = Toast.Style.Success;
        toast.message = "Links saved";
        reset({ urls: "", author: undefined, tags: undefined });
      } catch (error) {
        let message: string | undefined = undefined;
        if (error instanceof Error) {
          message = error.message;
        }
        toast.style = Toast.Style.Failure;
        toast.message = message;
      } finally {
        setLoading(false);
      }
    },
    validation: {
      urls: FormValidation.Required,
    },
    initialValues: {
      urls: "",
      tags: "",
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to Readwise" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Links" placeholder="Enter links" {...itemProps.urls} />
      <Form.TextField title="Author" placeholder="Enter author" {...itemProps.author} />
      <Form.TextField title="Tags" placeholder="Enter tags (comma-separated)" {...itemProps.tags} />
    </Form>
  );
}
