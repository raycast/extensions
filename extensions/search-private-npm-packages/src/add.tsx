import { SAccount } from "@data/schemas";
import { TAccount } from "@data/types";
import { useAccounts } from "@hooks/useAccounts";
import { Action, ActionPanel, Form, Toast, popToRoot, showToast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { validateSchema } from "@utils/schema-utils";

type TForm = {
  name: string;
  accessToken: string;
};

export default function Command() {
  const { addAccount } = useAccounts();
  const { handleSubmit, itemProps } = useForm<TForm>({
    onSubmit,
    validation: {
      name: FormValidation.Required,
      accessToken: FormValidation.Required,
    },
  });

  async function onSubmit(data: TForm) {
    const payload: TAccount = {
      ...data,
    };
    if (!validateSchema(SAccount, payload)) {
      showToast({ style: Toast.Style.Failure, title: "Invalid Account or Token" });
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Adding Account..." });
    try {
      await addAccount(payload);
    } catch {
      return;
    }
    toast.style = Toast.Style.Success;
    toast.title = "Account Added";
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Tracking Account" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Account"
        placeholder="User or organization name"
        info={`e.g. raycast for @raycast/* packages`}
      />
      <Form.PasswordField
        {...itemProps.accessToken}
        title="Access Token"
        placeholder="Access token for this account"
        info="Token with read access within the scope of the account"
      />
    </Form>
  );
}
