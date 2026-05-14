import { useState, useMemo } from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { withQuery } from "@/components";
import {
  useJiraCurrentUser,
  useJiraIssueQuery,
  useJiraIssueTransitionsQuery,
  useJiraIssueTransitionMutation,
} from "@/hooks";

export default withQuery(JiraIssueTransitionForm);

interface JiraIssueTransitionProps {
  issueKey: string;
  onUpdate?: () => void;
}

function JiraIssueTransitionForm({ issueKey, onUpdate }: JiraIssueTransitionProps) {
  const { pop } = useNavigation();
  const [selectedTransitionId, setSelectedTransitionId] = useState<string>("");
  const { currentUser } = useJiraCurrentUser();
  const { data: issue, isLoading: issueLoading } = useJiraIssueQuery(issueKey, {
    enabled: !!issueKey,
    meta: { errorMessage: "Failed to Load Issue" },
  });

  const {
    data: transitions,
    isLoading: transitionsLoading,
    isSuccess: transitionsSuccess,
  } = useJiraIssueTransitionsQuery(issueKey, {
    enabled: !!issueKey,
    meta: { errorMessage: "Failed to Load Issue Transitions" },
  });

  const transitionMutation = useJiraIssueTransitionMutation({
    onSuccess: () => {
      showToast({
        style: Toast.Style.Success,
        title: "Status Updated",
        message: `Issue ${issueKey} status has been updated successfully`,
      });
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to Update Status",
        message: `Failed to update status for issue ${issueKey}`,
      });
    },
  });

  const handleSubmit = async (values: { transitionId: string }) => {
    if (!values.transitionId) {
      showToast({
        style: Toast.Style.Failure,
        title: "No Status Selected",
      });
      return;
    }

    try {
      await transitionMutation.mutateAsync({
        issueKey,
        transitionId: values.transitionId,
      });
      onUpdate?.();
      pop();
    } catch {
      // Error handling is done by mutation onError
    }
  };

  const handleCancel = () => {
    pop();
  };

  const isLoading = issueLoading || transitionsLoading || transitionMutation.isPending;

  const availableStatusList = useMemo(() => {
    if (!issue || !transitions) return [];
    return transitions.transitions
      .filter((transition) => transition.to.id !== issue.fields.status?.id)
      .map((item) => ({ ...item, displayName: `${item.name} (${issue.fields.status?.name} → ${item.to.name})` }));
  }, [issue, transitions]);

  const displayValues = useMemo(() => {
    if (!issue) {
      return { issueKey: "-", summary: "-", status: "-", assignee: "-" };
    }

    const assigneeName = issue.fields.assignee?.displayName;
    const isAssignee = currentUser?.key === issue.fields.assignee?.key;
    const assigneeTips = isAssignee ? "" : " (not assigned to you)";
    return {
      issueKey: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: assigneeName ? `${assigneeName}${assigneeTips}` : `Unassigned${assigneeTips}`,
    };
  }, [issue, currentUser]);

  const hasPermission = useMemo(() => {
    return transitionsSuccess && !!transitions?.transitions.length;
  }, [transitionsSuccess, transitions?.transitions.length]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Transition Status"
      actions={
        <ActionPanel>
          {hasPermission && <Action.SubmitForm title="Submit" icon={Icon.Checkmark} onSubmit={handleSubmit} />}
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={handleCancel} />
        </ActionPanel>
      }
    >
      <Form.Description title="Issue Key" text={displayValues.issueKey} />
      <Form.Description title="Summary" text={displayValues.summary} />
      <Form.Description title="Assignee" text={displayValues.assignee} />
      <Form.Description title="Status" text={displayValues.status} />
      {transitionsSuccess && !hasPermission ? (
        <Form.Description title="Tips" text="⚠️ You don't have permission to transition this issue" />
      ) : (
        <Form.Dropdown
          id="transitionId"
          title="Action"
          placeholder="Select transition action..."
          value={selectedTransitionId}
          onChange={setSelectedTransitionId}
        >
          {availableStatusList.map((item) => (
            <Form.Dropdown.Item key={item.id} value={item.id} title={item.displayName} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
