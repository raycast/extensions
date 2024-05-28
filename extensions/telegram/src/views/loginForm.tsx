import { TelegramClient } from "telegram";
import { useContext, useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Form, getPreferenceValues, LocalStorage, PreferenceValues } from "@raycast/api";
import { returnClient } from "../utils/tgClient";
import { ClientContext } from "../contexts/clientContext";

let loginClient: TelegramClient;

export default function LoginForm() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const { api_id, api_hash } = getPreferenceValues<PreferenceValues>();
  const [isLoading, setIsLoading] = useState(true);
  const { setGlobalClient } = useContext(ClientContext);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        console.log("requested client from login form");
        loginClient = await returnClient();
        setGlobalClient(loginClient);
      } catch (error) {
        console.error("Error requesting client from login form: ", error);
        // You can set an error state here to show the error message on the UI
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return <Form isLoading />;
  }

  async function sendCodeHandler(): Promise<void> {
    setIsLoading(true);
    try {
      await loginClient.connect();
      await loginClient.sendCode(
        {
          apiId: parseInt(api_id),
          apiHash: api_hash,
        },
        phoneNumber
      );
      setIsCodeSent(true);
    } catch (error) {
      console.error("Error sending code: ", error);
      // You can set an error state here to show the error message on the UI
    } finally {
      setIsLoading(false);
    }
  }

  async function clientStartHandler(): Promise<void> {
    try {
      await loginClient.start({
        phoneNumber,
        password: userAuthParamCallback(password),
        phoneCode: userAuthParamCallback(phoneCode),
        onError: (err) => {
          console.log(err);
        },
      });
      await LocalStorage.setItem("session", JSON.stringify(loginClient.session.save()));
      await loginClient.sendMessage("me", { message: "You're successfully logged in!" });
      setLoggedIn(true);
    } catch (error) {
      console.error("Error starting client: ", error);
      // You can set an error state here to show the error message on the UI
    }
  }

  function userAuthParamCallback<T>(param: T): () => Promise<T> {
    return async function () {
      return await new Promise<T>((resolve) => {
        resolve(param);
      });
    };
  }
  return (
    <>
      {loggedIn ? (
        <Detail markdown={`You're successfully logged in!`} />
      ) : !isCodeSent ? (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={sendCodeHandler} />
            </ActionPanel>
          }
        >
          <Form.TextField id="phoneNumber" title="phoneNumber" value={phoneNumber} onChange={setPhoneNumber} />
          <Form.PasswordField id="password" title="password" value={password} onChange={setPassword} />
        </Form>
      ) : (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={clientStartHandler} />
            </ActionPanel>
          }
        >
          <Form.TextField id="phoneCode" title="phoneCode" value={phoneCode} onChange={setPhoneCode} />
        </Form>
      )}
    </>
  );
}
