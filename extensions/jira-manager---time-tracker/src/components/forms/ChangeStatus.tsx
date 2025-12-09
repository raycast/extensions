import { Action, ActionPanel, List, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getTransitions, transitionIssue } from "../../utils/jira";

export function ChangeStatus({ issueKey, onTransition }: { issueKey: string; onTransition: () => void }) {
  const { data: transitions, isLoading } = usePromise(getTransitions, [issueKey]);
  const { pop } = useNavigation();

  async function handleTransition(transitionId: string, transitionName: string) {
    try {
      showToast({ style: Toast.Style.Animated, title: `Transitioning to ${transitionName}...` });
      await transitionIssue(issueKey, transitionId);
      showToast({ style: Toast.Style.Success, title: "Status updated" });
      onTransition();
      pop();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to update status", message: String(error) });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Select New Status">
      {transitions?.map((t) => (
        <List.Item
          key={t.id}
          title={t.name}
          actions={
            <ActionPanel>
              <Action title={`Move to ${t.name}`} onAction={() => handleTransition(t.id, t.name)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
