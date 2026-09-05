import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ResultDetail } from "./components";
import { callMindsTool } from "./mcp";

type Values = { group: string; question: string; panelName: string };

export default function AskGroup({ group }: { group?: { id: string; name: string } }) {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function submit(values: Values) {
    if (!values.group.trim() || !values.question.trim()) {
      await showToast(Toast.Style.Failure, "Group and question are required");
      return;
    }
    setIsLoading(true);
    const toast = await showToast(Toast.Style.Animated, "Asking Group", "Minds is starting the research run.");
    try {
      const groupSelector = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(values.group.trim())
        ? { groupId: values.group.trim() }
        : { groupName: values.group.trim() };
      const result = await callMindsTool("ask_group", {
        ...groupSelector,
        question: values.question.trim(),
        ...(values.panelName.trim() ? { name: values.panelName.trim() } : {}),
      });
      toast.style = Toast.Style.Success;
      toast.title = "Group question submitted";
      toast.message = "The private Panel is now running.";
      push(<ResultDetail title="Group Question Submitted" result={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not ask Group";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Group" icon={Icon.Message} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Minds" url="https://getminds.ai/dashboard" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="group"
        title="Group"
        placeholder="Group name or UUID"
        defaultValue={group?.id ?? ""}
        info={group ? `Selected Group: ${group.name}` : "Enter an exact Group ID or a name for fuzzy matching."}
      />
      <Form.TextArea id="question" title="Question" placeholder="What should this audience evaluate?" />
      <Form.TextField id="panelName" title="Panel Name" placeholder="Optional name for this research run" />
    </Form>
  );
}
