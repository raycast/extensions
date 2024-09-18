import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { TokenResponse } from "./utils/types";
import { useState } from "react";
import { createToken } from "./utils/api";

export default function Token() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  type FormToken = {
    email: string;
    password: string;
    totp?: string;
  };
  const { handleSubmit, itemProps } = useForm<FormToken>({
    async onSubmit(values) {
      setIsLoading(true);

      const response = await createToken({ email: values.email, password: values.password, totp: Number(values.totp) });
      if (!("error" in response)) {
        push(<TokenDisplay token={response.token} />);
      }
      setIsLoading(false);
    },
    validation: {
      email: FormValidation.Required,
      password: FormValidation.Required,
      totp(value) {
        if (value)
          if (!Number(value)) return "The item must be a number";
          else if (value.length !== 6) return "The item must be exactly 6 digits";
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" placeholder="raycast@example.com" {...itemProps.email} />
      <Form.PasswordField title="Password" placeholder="hunter2" {...itemProps.password} />
      <Form.PasswordField
        title="TOTP (optional)"
        placeholder="123456"
        info="If your account has two-factor authentication enabled, you must also include a valid TOTP code in your request."
        {...itemProps.totp}
      />
    </Form>
  );
}

function TokenDisplay({ token }: TokenResponse) {
  async function copyTokenAndOpenExtensionPreferences() {
    await Clipboard.copy(token);
    openExtensionPreferences();
  }

  return (
    <Detail
      markdown={`TOKEN: ${token}
---

Press 'enter' to copy this token and navigate to Extension Preferences.`}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.Gear}
            title="Copy Token & Open Extension Preferences"
            onAction={copyTokenAndOpenExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
