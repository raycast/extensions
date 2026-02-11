import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { JiraIssue, fetchTransitions, updateIssueStatus, Transition } from "../api/jira-client";
import { useEffect, useState } from "react";

interface Props {
  issue: JiraIssue;
  onDone: () => void;
}

export default function UpdateStatusForm({ issue, onDone }: Props) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transitions, setTransitions] = useState<Transition[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const trans = await fetchTransitions(issue.key);
        setTransitions(trans);
      } catch (error: any) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch transitions",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [issue.key]);

  const handleSubmit = async (values: { transitionId: string }) => {
    setSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating status...",
    });

    try {
      await updateIssueStatus(issue.key, values.transitionId);
      toast.style = Toast.Style.Success;
      toast.title = "Status updated";
      onDone();
      pop();
    } catch (error: any) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update status";
      toast.message = error.message;
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isLoading || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Status" icon={Icon.Checkmark} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Updating status for ${issue.key}: ${issue.fields.summary}`} />
      <Form.Dropdown id="transitionId" title="New Status">
        {transitions.map((t) => (
          <Form.Dropdown.Item key={t.id} value={t.id} title={t.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
