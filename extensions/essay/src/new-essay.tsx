import { Form, ActionPanel, Action, showToast, Toast, LaunchProps, useNavigation, Icon } from "@raycast/api";
import useEssayStore from "./stores/essay-store";
import { showFailureToast } from "@raycast/utils";
import { EssayDetail } from "./components/essay-detail";
import { useState } from "react";

type Values = {
  content: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;
  const [loading, setLoading] = useState(false);
  const { createEssay } = useEssayStore();
  const { push } = useNavigation();
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
      const essay = await createEssay({ content: values.content });
      showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: "Essay published",
      });
      push(<EssayDetail essay={essay} />);
    } catch (error: unknown) {
      showFailureToast(error, {
        title: "Failed to publish essay, please check your API key, API endpoint and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      isLoading={loading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Publish" onSubmit={handleSubmit} icon={Icon.Check} />
          <Action.OpenInBrowser icon={Icon.Globe} title="Write in Browser" url={`https://www.essay.ink/compose`} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        enableMarkdown
        id="content"
        title="Essay"
        placeholder="Here begins..."
        defaultValue={draftValues?.content}
      />
    </Form>
  );
}
