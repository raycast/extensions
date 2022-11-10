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

export default function InviteBoard({ id }: { id: string }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Invite To Board"
            onSubmit={async (values: ShareBoardProps) => {
              try {
                await miro.inviteToBoard(id, { email: values.email, role: values.role }, values.message);
                await showToast({ style: Toast.Style.Success, title: "🎉 Invited to board!" });
                pop();
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Invite failed." });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="email" title="Email" placeholder="Enter email" />
      <Form.Dropdown id="role" title="Role">
        {(Object.keys(BoardMember.RoleEnum) as Array<keyof typeof BoardMember.RoleEnum>).map((role) => (
          <Form.Dropdown.Item key={role} value={role} title={role} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="message" title="Message" placeholder="Enter welcome message" />
    </Form>
  );
}
