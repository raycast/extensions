import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { changeWebsiteLinuxUserPassword } from "../../utils/api";
import { ChangeWebsiteLinuxUserPasswordRequest } from "../../types/websites";

type ChangeWebsiteLinuxUserPasswordProps = {
  domain: string;
  onLinuxUserPasswordChanged: () => void;
};
export default function ChangeWebsiteLinuxUserPassword({
  domain,
  onLinuxUserPasswordChanged,
}: ChangeWebsiteLinuxUserPasswordProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeWebsiteLinuxUserPasswordRequest>({
    async onSubmit(values) {
      const response = await changeWebsiteLinuxUserPassword({ ...values, domain });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Changed Website Linux Password successfully`);
        onLinuxUserPasswordChanged();
        pop();
      }
    },
  });
  return (
    <Form
      navigationTitle="Change Website Linux User Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Domain" text={domain} />
      <Form.PasswordField title="New Password" placeholder="hunter2" {...itemProps.password} />
    </Form>
  );
}
