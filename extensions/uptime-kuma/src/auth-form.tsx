import { Form, ActionPanel, Action, Icon, Toast, showToast, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { useForm, FormValidation } from "@raycast/utils";
import { checkUrl, getToken } from "./utils/functions";

export function AuthForm(props: { onSave: (url: string) => void }) {
  const [loading, setLoading] = useState<boolean>(false);

  interface submitValues {
    kuma_url: string;
    kuma_username: string;
    kuma_password: string;
    kuma_2fa: string;
  }

  const { handleSubmit, itemProps, setValidationError } = useForm<submitValues>({
    async onSubmit(values) {
      setLoading(true);

      try {
        await checkUrl(values.kuma_url);
      } catch (error) {
        showToast({
          title: "Unable to connect to socket, check your url",
          style: Toast.Style.Failure,
        });
        setValidationError("kuma_url", "Check URL");
        setLoading(false);
        return;
      }

      try {
        const token = await getToken(values.kuma_url, values.kuma_username, values.kuma_password, values.kuma_2fa);
        await LocalStorage.setItem("kuma_token", token);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Unable to get token, please check your credentials",
        });
        setValidationError("kuma_username", "Check Username");
        setValidationError("kuma_password", "Check Password");

        setLoading(false);
        return;
      }

      await showToast({ title: "Login Successful" });

      return props.onSave(values.kuma_url);
    },
    validation: {
      kuma_url: FormValidation.Required,
      kuma_username: FormValidation.Required,
      kuma_password: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField placeholder={"https://uptime.example.com"} title="Kuma URL" {...itemProps.kuma_url} />
      <Form.TextField placeholder={"Your kuma username"} title="Kuma Username" {...itemProps.kuma_username} />
      <Form.PasswordField placeholder={"Your kuma password"} title="Kuma Password" {...itemProps.kuma_password} />
      <Form.TextField
        placeholder={"Code from your authenticator app (if 2FA enabled)"}
        title="2FA Code"
        {...itemProps.kuma_2fa}
      />
    </Form>
  );
}

export default AuthForm;
