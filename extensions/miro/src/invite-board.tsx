// ShareBoard component
// This component is used to share the board with other users

import { BoardMember } from "@mirohq/miro-api";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import * as miro from "./oauth/miro";

interface ShareBoardProps {
  email: string;
  role: BoardMember["role"];
  message: string;
}

export default function InviteBoard({ board }: { board: { id: string } }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Invite to Board"
            onSubmit={async (values: ShareBoardProps) => {
              const toast = await showToast({ style: Toast.Style.Animated, title: "Sending invite to the board..." });
              try {
                await miro.inviteToBoard(board.id, { email: values.email, role: values.role }, values.message);
                toast.title = "🎉 Invite to the board sent!";
                toast.style = Toast.Style.Success;
                pop();
              } catch (err) {
                console.error(err);
                toast.title = "Could not send the invite.";
                toast.message = String(err);
                toast.style = Toast.Style.Failure;
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="jane@mycompany.com" />
      <Form.Dropdown id="role" title="Role">
        {(Object.keys(BoardMember.RoleEnum) as Array<keyof typeof BoardMember.RoleEnum>).map((role) => (
          <Form.Dropdown.Item key={role} value={role} title={role} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="message" title="Welcome Message" placeholder="Hey! Have a look at this awesome board..." />
    </Form>
  );
}
