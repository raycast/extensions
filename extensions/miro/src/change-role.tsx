import { BoardMember } from "@mirohq/miro-api";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { capitalizeFirstLetter } from "./helpers";
import * as miro from "./oauth/miro";

// change role react component
export default function ChangeRole({
  board,
  memberId,
  role,
}: {
  board: { id: string };
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
              const toast = await showToast({ style: Toast.Style.Animated, title: "Changing role..." });
              try {
                await miro.changeBoardMemberRole(board.id, memberId, value.role);
                toast.title = "🎉 Role changed!";
                toast.style = Toast.Style.Success;
                pop();
              } catch (err) {
                console.error(err);
                toast.title = "Could not change the role.";
                toast.message = String(err);
                toast.style = Toast.Style.Failure;
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
