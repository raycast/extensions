import { showToast, Clipboard, Form, Action, ActionPanel, Toast, showHUD, closeMainWindow, Icon } from "@raycast/api";
import { getSession, makeRequest } from "./api";

type Values = {
  description: string;
};

export default () => {
  const handleSubmit = async (values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });
    try {
      const email = await create_masked_email(values.description);
      Clipboard.copy(email);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true });
      await showHUD("🎉 Masked email address copied to clipboard");
    } catch (e) {
      if (e instanceof Error) {
        await toast.hide();
        showToast({ style: Toast.Style.Failure, title: "Error", message: e.message });
      }
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Masked Email" icon={Icon.EyeDisabled} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="description"
        title="Description"
        placeholder="What is this masked email address for? (optional)"
      />
    </Form>
  );
};

type APIRequest<Method> = {
  using: string[];
  methodCalls: [string, Method, string][];
};

type CreateMaskedEmail = {
  accountId?: string;
  create: Record<
    string,
    {
      state: "pending" | "enabled" | "disabled" | "deleted";
      description?: string;
    }
  >;
};

type MaskedEmailSet = {
  created: Record<
    string,
    {
      email: string;
    }
  >;
};

const MaskedEmailCapability = "https://www.fastmail.com/dev/maskedemail";

const create_masked_email = async (description: string) => {
  const session = await getSession();
  const request: APIRequest<CreateMaskedEmail> = {
    using: ["urn:ietf:params:jmap:core", MaskedEmailCapability],
    methodCalls: [
      [
        "MaskedEmail/set",
        {
          accountId: session.primaryAccounts[MaskedEmailCapability],
          create: {
            "raycast-masked-email": {
              state: "enabled",
              description,
            },
          },
        },
        "0",
      ],
    ],
  };
  try {
    const response = await makeRequest<CreateMaskedEmail, MaskedEmailSet>({ request });
    return Object.values(response.methodResponses[0][1].created)[0].email;
  } catch (error) {
    throw new Error(`Failed to create masked email: ${error}`);
  }
};
