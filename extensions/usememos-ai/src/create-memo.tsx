import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { getUsememosClient } from "./api/usememos";

type Visibility = "PRIVATE" | "WORKSPACE" | "PUBLIC";

export default function CreateMemo() {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Content required",
        message: "Please enter some content for your memo",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const client = getUsememosClient();
      await client.createMemo({
        content: content.trim(),
        visibility,
      });

      showToast({
        style: Toast.Style.Success,
        title: "Memo created",
      });

      popToRoot();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create memo",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Memo"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Write your memo here... (Supports Markdown)"
        value={content}
        onChange={setContent}
        enableMarkdown
        autoFocus
      />
      <Form.Dropdown
        id="visibility"
        title="Visibility"
        value={visibility}
        onChange={(v) => setVisibility(v as Visibility)}
      >
        <Form.Dropdown.Item value="PRIVATE" title="Private" icon={Icon.Lock} />
        <Form.Dropdown.Item
          value="WORKSPACE"
          title="Workspace"
          icon={Icon.Building}
        />
        <Form.Dropdown.Item value="PUBLIC" title="Public" icon={Icon.Globe} />
      </Form.Dropdown>
      <Form.Description
        title="Tips"
        text="Use Markdown for formatting. Tags are auto-extracted from #hashtags."
      />
    </Form>
  );
}
