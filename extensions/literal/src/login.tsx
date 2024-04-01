import { LocalStorage, showToast, Toast, Form, ActionPanel, Action, Icon, open } from "@raycast/api";
import { useContext, useState } from "react";
import { AuthContext } from "./authContext";
import { LOG_IN } from "./mutations/login";
import { useMutation } from "@apollo/client";

export default function Login() {
  const { setToken } = useContext(AuthContext);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  const [login] = useMutation(LOG_IN, {
    onCompleted: (data) => {
      showToast({
        style: Toast.Style.Success,
        title: "Logged in successfully",
      });
      const { login } = data;
      LocalStorage.setItem("x-literal-token", login.token);
      setToken(login.token);
    },
    onError: () => {
      const options: Toast.Options = {
        style: Toast.Style.Failure,
        title: "Failed to login",
        message: "Check credentials and try again",
        primaryAction: {
          title: "Go to https://literal.club",
          onAction: (toast) => {
            open("https://literal.club");
            toast.hide();
          },
        },
      };
      showToast(options);
    },
  });

  function handleMailError() {
    if (emailError && emailError.length > 0) {
      setEmailError(undefined);
    }
  }

  function handlePasswordError() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              login({
                variables: {
                  email: values.email,
                  password: values.password,
                },
              });
            }}
            icon={Icon.ArrowRight}
            title="Login"
          />
          <Action.OpenInBrowser url="https://literal.club" title="Open Literal" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="email"
        placeholder="me@email.com"
        title="Email"
        autoFocus
        error={emailError}
        onChange={handleMailError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setEmailError("The field should't be empty!");
          } else {
            handleMailError();
          }
        }}
      />
      <Form.PasswordField
        id="password"
        placeholder="•••••••••••••"
        title="Password"
        error={passwordError}
        onChange={handlePasswordError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setPasswordError("The field should't be empty!");
          } else {
            handlePasswordError();
          }
        }}
      />
    </Form>
  );
}
