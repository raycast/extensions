// publish-post.tsx
import { ActionPanel, Form, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [postId, setPostId] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const { "Session Token": sessionToken } = getPreferenceValues();

  async function handleSubmit(values: { postId: string; platforms: string[] }) {
    try {
      const res = await fetch("https://logggai.run/api/integrations/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ articleId: values.postId, platforms: values.platforms }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ style: Toast.Style.Success, title: "Post published!" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Failed to publish post" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish Post" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="postId" title="Post ID" value={postId} onChange={setPostId} />
      <Form.TagPicker id="platforms" title="Platforms" value={platforms} onChange={setPlatforms}>
        <Form.TagPicker.Item value="linkedin" title="LinkedIn" />
        <Form.TagPicker.Item value="notion" title="Notion" />
        <Form.TagPicker.Item value="jira" title="Jira" />
        <Form.TagPicker.Item value="linear" title="Linear" />
      </Form.TagPicker>
    </Form>
  );
}
