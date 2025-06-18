import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues, popToRoot } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";

type Values = {
  title: string;
  content: string;
};

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  async function handlePost(values: Values) {
    const toast = await showToast({
      title: "Posting to Micro.blog",
      message: "Please wait...",
      style: Toast.Style.Animated,
    });

    if (!values.content || values.content.trim() === "") {
      toast.style = Toast.Style.Failure;
      toast.message = "Content is required";
      return;
    }

    const token = preferences.apiKey;
    if (!token) {
      toast.style = Toast.Style.Failure;
      toast.message = "API token is required in preferences";
      return;
    }

    const formBody = new URLSearchParams();
    formBody.append("h", "entry");
    formBody.append("content", values.content);
    if (values.title && values.title.trim() !== "") {
      formBody.append("name", values.title);
    }

    try {
      setIsLoading(true);
      const response = await fetch("https://micro.blog/micropub", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      });

      if (response.ok) {
        await popToRoot({ clearSearchBar: true });
        toast.title = "Post published to Micro.blog";
        toast.style = Toast.Style.Success;
        toast.message = "Post published to Micro.blog";
      } else {
        const errorText = await response.text();
        toast.title = "Failed to post";
        toast.message = `${response.status} ${response.statusText}: ${errorText}`;
        toast.style = Toast.Style.Failure;
      }
    } catch (error) {
      await showFailureToast(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handlePost} title="Post" />
        </ActionPanel>
      }
    >
      <Form.Description text="Post to Micro.blog" />
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.TextArea id="content" title="Content" placeholder="Craft your post" autoFocus={true} />
    </Form>
  );
}
