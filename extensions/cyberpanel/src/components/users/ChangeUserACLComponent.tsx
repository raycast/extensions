import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { ChangeUserACLFormValues, User } from "../../types/users";
import { FormValidation, useForm } from "@raycast/utils";
import { changeUserACL } from "../../utils/api";

type ChangeUserACLProps = {
  user: User;
  onACLChanged: () => void;
};
export default function ChangeUserACL({ user, onACLChanged }: ChangeUserACLProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeUserACLFormValues>({
    async onSubmit(values) {
      const response = await changeUserACL({ ...values, selectedUser: user.userName });
      if (response.status === 1) {
        await showToast(Toast.Style.Success, "SUCCESS", `Changed ${user.userName} ACL successfully`);
        onACLChanged();
        pop();
      }
    },
    validation: {
      selectedACL: FormValidation.Required,
    },
  });

  return (
    <Form
      navigationTitle={`Change ${user.userName} ACL`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Username" text={user.userName} />
      <Form.TextField
        title="New ACL"
        placeholder="user | admin | custom"
        info="Access Control Level"
        {...itemProps.selectedACL}
      />
    </Form>
  );
}
