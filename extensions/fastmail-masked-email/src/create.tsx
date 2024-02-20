import {
  showToast,
  Clipboard,
  Form,
  Action,
  ActionPanel,
  Toast,
  showHUD,
  closeMainWindow,
  Icon,
  getPreferenceValues,
  PopToRootType,
} from "@raycast/api";
import { getSession, makeRequest } from "./api";

type Preferences = {
  create_prefix: string;
};

type Values = {
  prefix: string;
  description: string;
};

export default () => {
  const preferences = getPreferenceValues<Preferences>();
  const handleSubmit = async (values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating masked email..." });
    try {
      const email = await create_masked_email(values);
      Clipboard.copy(email);
      await toast.hide();
      await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
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
        id="prefix"
        title="Prefix (Optional)"
        placeholder="Prefix to use for this email address"
        defaultValue={preferences.create_prefix}
        info={`This field is optional. If you have configured a default prefix in the preferences, it will be used here. If you leave this field empty, no prefix will be used.

A prefix must be <= 64 characters in length and only contain characters a-z, 0-9 and _ (underscore)`}
      />
      <Form.TextField
        id="description"
        title="Description (Optional)"
        placeholder="What is this masked email address for?"
        autoFocus={true}
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
      emailPrefix?: string;
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

const create_masked_email = async ({ prefix, description }: Values) => {
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
              emailPrefix: sanitizePrefix(prefix),
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

const sanitizePrefix = (prefix: string): string => {
  return prefix
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .substring(0, 64);
};
