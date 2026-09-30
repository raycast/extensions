import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { changeWebsitePHPVersion } from "../../utils/api";
import { ChangeWebsitePHPVersionRequest } from "../../types/websites";
import { AVAILABLE_PHP_VERSIONS_FOR_WEBSITES } from "../../utils/constants";

type ChangeWebsitePHPVersionProps = {
  childDomain: string;
  onWebsitePHPVersionChanged: () => void;
};
export default function ChangeWebsitePHPVersion({
  childDomain,
  onWebsitePHPVersionChanged,
}: ChangeWebsitePHPVersionProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ChangeWebsitePHPVersionRequest>({
    async onSubmit(values) {
      const response = await changeWebsitePHPVersion({ ...values, childDomain });
      if (response.error_message === "None") {
        await showToast(Toast.Style.Success, "SUCCESS", `Change Website PHP Version successfully`);
        onWebsitePHPVersionChanged();
        pop();
      }
    },
  });
  return (
    <Form
      navigationTitle="Change Website PHP Version"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.Description title="Website" text={childDomain} />
      <Form.Dropdown title="PHP Version" {...itemProps.phpSelection}>
        {AVAILABLE_PHP_VERSIONS_FOR_WEBSITES.map((version) => (
          <Form.Dropdown.Item key={version} title={version} value={version} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
