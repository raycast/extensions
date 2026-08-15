import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import useEssayStore from "../stores/essay-store";
import { Essay } from "../types";
import { EssayDetail } from "./essay-detail";
import { useState } from "react";

type Values = {
  content: string;
};

export default function EssayForm({ essay }: { essay: Essay }) {
  const { push } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState(essay.content);
  const { updateEssay } = useEssayStore();
  async function handleSubmit(values: Values) {
    try {
      if (values.content.trim().length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "Essay content cannot be empty",
        });
        return;
      }
      setLoading(true);
      showToast({
        style: Toast.Style.Animated,
        title: "Saving the essay...",
      });
      const updated = await updateEssay({ id: essay.id, content: values.content });
      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: "Essay updated.",
      });
      push(<EssayDetail essay={updated} />);
    } catch (error: unknown) {
      showFailureToast(error, {
        title: "Failed to update essay, please check your API key, API endpoint and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        enableMarkdown
        id="content"
        title="Essay"
        placeholder="Here begins..."
        value={content}
        onChange={(val) => setContent(val)}
      />
    </Form>
  );
}
