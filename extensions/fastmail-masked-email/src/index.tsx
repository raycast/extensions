import {
  showToast,
  getPreferenceValues,
  Clipboard,
  Form,
  Action,
  ActionPanel,
  Toast,
  showHUD,
  closeMainWindow,
  Icon,
} from "@raycast/api";
import fetch from "node-fetch";

type Preferences = {
  api_token: string;
};

type Values = {
  description: string;
};

export default () => {
  const preference = getPreferenceValues<Preferences>();

  const handleSubmit = async (values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });
    try {
      const email = await create_masked_email(preference.api_token, values.description);
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

type Session = {
  capabilities: Record<string, unknown>;
  apiUrl: string;
  primaryAccounts: Record<string, string>;
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

type APIResponse<Method> = {
  methodResponses: [string, Method, string][];
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

const create_masked_email = async (api_token: string, description: string) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${api_token}`,
    "Content-Type": "application/json",
  };

  let session;
  try {
    session = (await (
      await fetch("https://api.fastmail.com/jmap/session", {
        headers,
      })
    ).json()) as Session;
  } catch (error) {
    throw new Error("Failed to login. Please check your API token.");
  }

  const payload: APIRequest<CreateMaskedEmail> = {
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
    const result = (await (
      await fetch(session.apiUrl, {
        method: "POST",
        body: JSON.stringify(payload),
        headers,
      })
    ).json()) as APIResponse<MaskedEmailSet>;
    const email = Object.values(result.methodResponses[0][1].created)[0].email;
    return email;
  } catch (error) {
    throw new Error(`Failed to create masked email: ${error}`);
  }
};
