import {
  Action,
  ActionPanel,
  Form,
  Toast,
  popToRoot,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { withGitHubOAuth } from "./lib/auth";
import { appendCreatedGistToCache } from "./lib/cache-utils";

type FormValues = {
  description: string;
  filename: string;
  content: string;
  visibility: string;
};

function CreateGist() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    if (!values.filename.trim() || !values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Filename and content are required",
      });
      return;
    }

    setIsLoading(true);
    try {
      const gist = await appendCreatedGistToCache({
        description: values.description.trim(),
        filename: values.filename.trim(),
        content: values.content,
        isPublic: values.visibility === "public",
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Gist created",
        message: gist.htmlUrl,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create gist",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Gist" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="Optional gist description"
      />
      <Form.TextField id="filename" title="Filename" placeholder="snippet.ts" />
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="secret">
        <Form.Dropdown.Item value="secret" title="Secret" />
        <Form.Dropdown.Item value="public" title="Public" />
      </Form.Dropdown>
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste or type gist content"
      />
    </Form>
  );
}

export default withGitHubOAuth(CreateGist);
