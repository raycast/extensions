import { Form, ActionPanel, Action, Icon, Toast, showToast, LocalStorage, useNavigation } from "@raycast/api";
import { UptimeKuma } from "./modules/UptimeKuma";
import { useState } from "react";
import ListMonitors from "./list-monitors";

export function AuthForm() {
  const [urlError, setUrlError] = useState<string>("");
  const [usernameError, setUsernameError] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [codeError, setCodeError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const { push } = useNavigation();

  async function handleSubmit(values: {
    kuma_url: string;
    kuma_username: string;
    kuma_password: string;
    kuna_2fa: string;
  }) {
    setLoading(true);

    try {
      await checkUrl(values.kuma_url);
    } catch (error) {
      showToast({
        title: "Unable to connect to socket, check your url",
        style: Toast.Style.Failure,
      });
      setLoading(false);
      return;
    }

    let token = "";
    try {
      token = await getToken(values.kuma_url, values.kuma_username, values.kuma_password, values.kuna_2fa);
    } catch (error) {
      showToast({
        title: "Unable to get token, please check your credentials",
        style: Toast.Style.Failure,
      });
      setLoading(false);
      return;
    }

    await LocalStorage.setItem("kuma_url", values.kuma_url);
    await LocalStorage.setItem("kuma_token", token);

    showToast({
      title: "Login Successful",
      style: Toast.Style.Success,
    });

    setLoading(false);

    push(<ListMonitors />);
  }

  function getToken(url: string, username: string, password: string, code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const kuma = new UptimeKuma(url);

      kuma.on("connected", () => {
        kuma.getToken(username, password, code);
      });

      kuma.on("token", (token) => {
        kuma.disconnect();
        resolve(token);
      });

      kuma.on("error", (error) => {
        kuma.disconnect();
        reject(error);
      });

      kuma.connect();
    });
  }

  function checkUrl(url: string) {
    return new Promise((resolve, reject) => {
      const checker = new UptimeKuma(url);

      checker.on("connected", () => {
        resolve(true);
        checker.disconnect();
      });

      checker.on("error", (error) => {
        reject(error);
        checker.disconnect();
      });

      checker.connect();
    });
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Login" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        placeholder={"https://uptime.example.com"}
        id="kuma_url"
        title="Kuma url"
        error={urlError}
        defaultValue=""
        onBlur={(event) => {
          if (event.target.value) {
            checkUrl(event.target.value)
              .then(() => {
                setUrlError("");
              })
              .catch((error) => {
                setUrlError(error);
              });
          } else {
            setUrlError("Please enter a valid url");
          }
        }}
      />
      <Form.TextField
        placeholder={"Your kuma username"}
        error={usernameError}
        id="kuma_username"
        title="Kuma Username"
        defaultValue=""
        onBlur={(event) => {
          if (event.target.value) {
            setUsernameError("");
          } else {
            setUsernameError("Please enter a username");
          }
        }}
      />
      <Form.PasswordField
        placeholder={"Your kuma password"}
        error={passwordError}
        id="kuma_password"
        title="Kuma Password"
        defaultValue=""
        onBlur={(event) => {
          if (event.target.value) {
            setPasswordError("");
          } else {
            setPasswordError("Please enter a password");
          }
        }}
      />
      <Form.TextField
        placeholder={"Code from your authenticator app (if 2FA enabled)"}
        error={codeError}
        id="kuna_2fa"
        title="2FA Code"
        defaultValue=""
      />
    </Form>
  );
}

export default AuthForm;
