import { ActionPanel, Action, Form, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { getPassboltClient } from "./lib/passbolt";
import { generatePassword, getDefaultPasswordOptions } from "./utils/password-generator";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const [client] = useState(() => getPassboltClient());
  const [showPassword, setShowPassword] = useState(false);

  const { handleSubmit, itemProps, setValue } = useForm<{
    name: string;
    username: string;
    uri: string;
    password: string;
    description: string;
  }>({
    initialValues: { name: "", username: "", uri: "", password: "", description: "" },
    validation: { name: FormValidation.Required, password: FormValidation.Required },
    onSubmit: submitResource,
  });

  async function submitResource(values: {
    name: string;
    username: string;
    uri: string;
    password: string;
    description: string;
  }) {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating password..." });
    try {
      await client.createResource(values);
      toast.style = Toast.Style.Success;
      toast.title = "Password created!";
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create password";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleGeneratePassword() {
    const options = getDefaultPasswordOptions();
    const newPassword = generatePassword(options);
    setValue("password", newPassword);
    showToast({
      style: Toast.Style.Success,
      title: "Password generated!",
      message: "Click the eye icon to view it",
    });
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Password" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action
            title="Generate Password"
            onAction={handleGeneratePassword}
            icon={Icon.Key}
            shortcut={{ modifiers: ["cmd"], key: "g" }}
          />
          <Action
            title={showPassword ? "Hide Password" : "Show Password"}
            onAction={() => setShowPassword(!showPassword)}
            icon={showPassword ? Icon.EyeDisabled : Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a new password in your Passbolt vault" />
      <Form.Separator />

      <Form.TextField
        {...itemProps.name}
        title="Name"
        placeholder="e.g. Google Account"
        info="A descriptive name for this password"
      />

      <Form.TextField
        {...itemProps.username}
        title="Username"
        placeholder="e.g. user@example.com"
        info="Email or username for login"
      />

      {showPassword ? (
        <Form.TextField
          {...itemProps.password}
          title="Password"
          placeholder="Enter or generate password"
          info="Press Cmd+G to generate a secure password"
        />
      ) : (
        <Form.PasswordField
          {...itemProps.password}
          title="Password"
          placeholder="Enter or generate password"
          info="Press Cmd+G to generate a secure password"
        />
      )}

      <Form.TextField
        {...itemProps.uri}
        title="URI"
        placeholder="https://example.com"
        info="Website URL or application identifier"
      />

      <Form.Separator />

      <Form.TextArea
        {...itemProps.description}
        title="Notes"
        placeholder="Optional notes or additional information"
        enableMarkdown
      />
    </Form>
  );
}
