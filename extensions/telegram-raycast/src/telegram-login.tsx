import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  LocalStorage,
  Form,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import got from "got";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  username: string;
}

export default function Command() {
  const [isCodeFieldVisible, setIsCodeFieldVisible] = useState(false);

  let currentAction = <RequestPhoneCode setIsCodeFieldVisible={setIsCodeFieldVisible} />;
  let currentFields = undefined;
  if (isCodeFieldVisible) {
    currentAction = <SendPhoneCode />;
    currentFields = (
      <>
        <Form.TextField id="code" title="Code" placeholder="Enter the code you received" />
        <Form.PasswordField id="password" title="Password" placeholder="Enter the password IF you have set one" />
      </>
    );
  }

  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory target="https://github.com/noxlovette/telegram-proxy" text="Open Proxy Code" />
      }
      navigationTitle="Telegram Login"
      actions={<ActionPanel>{currentAction}</ActionPanel>}
    >
      {currentFields}
      <Form.Description
        title="Log into Telegram"
        text="This command will log you into Telegram. The fields will render as you progress. Your phone number is ready to be sent."
      />
    </Form>
  );
}

function RequestPhoneCode({
  setIsCodeFieldVisible,
}: {
  setIsCodeFieldVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  async function handleSubmit() {
    const { phoneNumber } = getPreferenceValues<ExtensionPreferences>(); // Replace with the actual phone number

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Talking to Proxy",
    });

    try {
      const { body } = await got.post("https://telray-proxy.up.railway.app/send-code", {
        //@ts-expect-error refactoring this code according to types breaks it
        json: {
          phoneNumber: phoneNumber,
        },
        responseType: "json",
      });

      toast.style = Toast.Style.Success;
      toast.title = body.message;
      toast.message = "Please enter the code you received";

      LocalStorage.setItem("phone", phoneNumber);
      setIsCodeFieldVisible(true);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sending to proxy";
      toast.message = String(error);
    }
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Request Code" onSubmit={handleSubmit} />;
}

function SendPhoneCode() {
  async function handleSubmit(values: { code: string; password: string }) {
    if (!values.code) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter the code",
      });
      return;
    } else if (values.code.length !== 5) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid code",
        message: "Please enter a 5-digit code",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending code to TG",
    });

    try {
      const { body } = await got.post("https://telray-proxy.up.railway.app/start-client", {
        // @ts-expect-error refactoring this code according to types breaks it
        json: {
          phoneNumber: await LocalStorage.getItem("phone"),
          password: values.password || "",
          phoneCode: values.code,
        },
        responseType: "json",
      });

      toast.style = Toast.Style.Success;
      toast.title = "Logged in";
      toast.message = "Successfully started client";
      await LocalStorage.clear();
      await LocalStorage.setItem("savedSession", body.savedSession);

      const SESSION = new StringSession(body.savedSession); // might be redundant but it works
      const client = new TelegramClient(SESSION, 12345678, "api_hash", { connectionRetries: 5 });
      await client.connect();
      const contacts = await client.invoke(new Api.contacts.GetContacts({}));
      if (contacts instanceof Api.contacts.Contacts) {
        const usersList: Contact[] = contacts.users.map((user) => {
          if (user instanceof Api.User) {
            return {
              id: user.id.toString(),
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              phoneNumber: user.phone || "",
              username: user.username || "",
            };
          } else {
            return {
              id: user.id.toString(),
              firstName: "",
              lastName: "",
              phoneNumber: "",
              username: "",
            };
          }
        });

        LocalStorage.setItem("contacts", JSON.stringify(usersList));
      }
      await launchCommand({
        name: "telegram-send-message",
        type: LaunchType.UserInitiated,
        context: { message: "You are all set!" },
      });
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start client";
      toast.message = "Check the code/password";
      error;
    }
  }

  return <Action.SubmitForm icon={Icon.Upload} title="Send Code" onSubmit={handleSubmit} />;
}
