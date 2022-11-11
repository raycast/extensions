import { BoardMember } from "@mirohq/miro-api";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { capitalizeFirstLetter } from "./helpers";
import * as miro from "./oauth/miro";

// change role react component
export default function ChangeRole({
  id,
  memberId,
  role,
}: {
  id: string;
  memberId: string;
  role: BoardMember["role"];
}) {
  const defaultRole = capitalizeFirstLetter(role ? role : BoardMember.RoleEnum.Viewer);
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Change Role"
            onSubmit={async (value) => {
              try {
                await miro.changeBoardMemberRole(id, memberId, value.role);
                await showToast({ style: Toast.Style.Success, title: "🎉 Changed role!" });
                pop();
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Change role failed." });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="role" defaultValue={defaultRole} title="Role">
        {(Object.keys(BoardMember.RoleEnum) as Array<keyof typeof BoardMember.RoleEnum>).map((role) => (
          <Form.Dropdown.Item key={role} value={role} title={role} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
