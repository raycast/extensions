import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import ListMembers from "./list-member";
import * as miro from "./oauth/miro";

// remove member react component
export default function RemoveMember({ id, memberId }: { id: string; memberId: string }) {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Remove Member"
            onAction={async () => {
              try {
                await miro.removeBoardMember(id, memberId);
                await showToast({ style: Toast.Style.Success, title: "🎉 Removed member!" });
                push(<ListMembers {...{ id }} />);
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Remove member failed." });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={"⚠️ Warning"} text={"Are you sure you want to remove this member?"} />
    </Form>
  );
}
