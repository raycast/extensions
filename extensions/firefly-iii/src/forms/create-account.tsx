import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { AccountStore, AccountType } from "../types";
import { firefly } from "../firefly";

export default function CreateAccount() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm<AccountStore>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const { data } = await firefly.accounts.create(values);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = data.attributes.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Name" {...itemProps.name} />
      <Form.Dropdown id="type" title="Type" onChange={(val) => setValue("type", val as AccountType)}>
        {Object.keys(AccountType).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextArea
        title="Notes"
        placeholder="Notes"
        info="This field supports Markdown."
        enableMarkdown
        {...itemProps.notes}
      />
    </Form>
  );
}
