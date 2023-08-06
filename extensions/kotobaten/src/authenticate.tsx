import { ActionPanel, Action, Form, showToast, useNavigation, Icon, Toast } from "@raycast/api";
import { useState } from "react";
import { validateRequired } from "./services/validation";
import { authenticate } from "./services/authentication";

export default function Authenticate() {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const onChangeEmail = (newValue: string) => {
    setEmailError(validateRequired(newValue, "Email"));
    setEmail(newValue);
  };

  const onChangePassword = (newValue: string) => {
    setPasswordError(validateRequired(newValue, "Password"));
    setPassword(newValue);
  };

  const onSubmit = async () => {
    if (emailError || passwordError) {
      showToast({
        title: "Please fix the errors and try submitting again.",
        style: Toast.Style.Failure,
      });
      return;
    }

    setIsLoading(true);

    try {
      const isAuthenticated = await authenticate(email, password);

      if (!isAuthenticated) {
        showToast({ title: "Email or password is not valid.", style: Toast.Style.Failure });
        setEmail("");
        return;
      }

      navigation.pop();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Log into Kotobaten"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log In" onSubmit={onSubmit} icon={Icon.ArrowRight} />
          <Action.OpenInBrowser title="Create an Account" url="https://kotobaten.app" icon={Icon.Bookmark} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        title="Email"
        placeholder="Enter your email."
        error={emailError}
        onChange={onChangeEmail}
        onBlur={() => onChangeEmail(email)}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your password."
        error={passwordError}
        onChange={onChangePassword}
        onBlur={() => onChangePassword(password)}
      />
    </Form>
  );
}
