import { TelegramClient } from "telegram";
import { useContext, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  openExtensionPreferences,
  PreferenceValues,
  showHUD,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getSession, returnClient } from "./utils/tgClient";
import { ClientContext } from "./contexts/clientContext";
import { setTimeout } from "timers/promises";
import Preferences from "./preferences";

let loginClient: TelegramClient;
let sessionKey: string;
(async () => {
  sessionKey = await getSession();
})();

export default function LoginForm() {
  const [phoneCode, setPhoneCode] = useState("");
  const {
    api_id: apiId,
    api_hash: apiHash,
    phone_number: phoneNumber,
    password,
  } = getPreferenceValues<PreferenceValues>();
  const [isLoading, setIsLoading] = useState(true);
  const { setGlobalClient } = useContext(ClientContext);
  const [loggedIn, setLoggedIn] = useState(apiId && apiHash && sessionKey);
  const { pop } = useNavigation();
  const [openPreferences, setOpenPreferences] = useState(false);

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

  useEffect(() => {
    (async () => {
      if (loginClient) {
        await sendCodeHandler();
      }
    })();
  }, [loginClient]);

  useEffect(() => {
    if (loggedIn) {
      setTimeout(3000).then(() => {
        pop();
      });
    }
  }, [loggedIn]);

  if (isLoading) {
    return <Form isLoading />;
  }

  async function sendCodeHandler(): Promise<void> {
    setIsLoading(true);
    try {
      await loginClient.connect();
      await loginClient.sendCode(
        {
          apiId: parseInt(apiId),
          apiHash: apiHash,
        },
        phoneNumber
      );
    } catch (error) {
      console.error("Error sending code: ", error);
      // You can set an error state here to show the error message on the UI
    } finally {
      setIsLoading(false);
    }
  }

  async function clientStartHandler(): Promise<void> {
    try {
      setIsLoading(true);
      await loginClient.start({
        phoneNumber,
        password: userAuthParamCallback(password),
        phoneCode: userAuthParamCallback(phoneCode),
        onError: (err) => {
          console.log(err);
          throw new Error(err.message);
        },
      });
      await LocalStorage.setItem("session", JSON.stringify(loginClient.session.save()));
      await loginClient.sendMessage("me", { message: "You're successfully logged in! Taking you back to homepage" });
      setLoggedIn(true);
    } catch (e) {
      const error = e as Error;
      if (error.message.includes("Password is empty")) {
        await showHUD("Password is empty, redirecting you to preferences");
        console.log("coming here");
        setOpenPreferences(true);
      }
      // You can set an error state here to show the error message on the UI
    } finally {
      setIsLoading(false);
    }
  }

  function userAuthParamCallback<T>(param: T): () => Promise<T> {
    return async function () {
      return await new Promise<T>((resolve) => {
        resolve(param);
      });
    };
  }
  if (openPreferences) {
    const message = "2FA enabled. Please open the extension preferences to input password";
    return <Preferences message={message}></Preferences>;
  }
  return (
    <>
      {loggedIn ? (
        <Detail markdown={`You're successfully logged in!`} />
      ) : (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm onSubmit={clientStartHandler} />
            </ActionPanel>
          }
        >
          <Form.TextField id="phoneCode" title="Phone Code" value={phoneCode} onChange={setPhoneCode} />
        </Form>
      )}
    </>
  );
}
