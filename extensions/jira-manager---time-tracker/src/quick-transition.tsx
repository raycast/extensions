import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getTransitions, transitionIssue } from "./utils/jira";

interface QuickTransitionProps {
  initialIssueKey?: string;
}

export default function Command({ initialIssueKey }: QuickTransitionProps) {
  const [issueKey, setIssueKey] = useState<string>(initialIssueKey || "");
  const { pop } = useNavigation();
  // Only fetch transitions if we have a valid-looking issue key (e.g., PROJ-123)
  const isValidKey = issueKey.length > 3 && issueKey.includes("-");

  const { data: transitions, isLoading } = usePromise(
    async (key) => {
      if (!isValidKey) return [];
      try {
        return await getTransitions(key);
      } catch {
        // If issue not found or no access, return empty
        return [];
      }
    },
    [issueKey],
  );

  async function handleTransition(transitionId: string, transitionName: string) {
    if (!isValidKey) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Issue Key" });
      return;
    }

    try {
      showToast({ style: Toast.Style.Animated, title: `Transitioning ${issueKey} to ${transitionName}...` });
      await transitionIssue(issueKey, transitionId);
      showToast({ style: Toast.Style.Success, title: "Status updated" });
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: String(error) });
    }
  }

  // If passed initialIssueKey, we might want to just show the status selection list?
  // But describing "Direct issue key input" implies we type it.

  return (
    <Form
      navigationTitle="Quick Transition"
      actions={
        <ActionPanel>
          {/* If we have transitions, we can show actions to transition directly if desired, 
               but Form is better for input. 
               However, to pick a status, we need a second step or a dropdown.
               Let's use a Dropdown if transitions are available. */}
          {transitions && transitions.length > 0 && (
            <Action.SubmitForm
              title="Transition Issue"
              onSubmit={(values) => {
                if (values.transition) {
                  const t = transitions.find((tr) => tr.id === values.transition);
                  if (t) handleTransition(t.id, t.name);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="issueKey"
        title="Issue Key"
        placeholder="e.g. PROJ-123"
        value={issueKey}
        onChange={setIssueKey}
        autoFocus
      />

      {isValidKey &&
        (transitions && transitions?.length > 0 ? (
          <Form.Dropdown id="transition" title="New Status">
            {transitions.map((t) => (
              <Form.Dropdown.Item key={t.id} value={t.id} title={t.name} icon={Icon.ArrowRight} />
            ))}
          </Form.Dropdown>
        ) : isLoading ? (
          <Form.Description title="Status" text="Loading transitions..." />
        ) : (
          <Form.Description title="Error" text="No transitions found or invalid key" />
        ))}
    </Form>
  );
}
