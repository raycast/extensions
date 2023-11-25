import {
  Form,
  ActionPanel,
  Action,
  Toast,
  Clipboard,
  showToast,
  getPreferenceValues,
  useNavigation,
  Icon,
} from "@raycast/api";
import fetch from "node-fetch";
import { encrypt, createMessage, WebStream } from "openpgp";
import { useState } from "react";

const preferences: { url: string; apiUrl: string } = getPreferenceValues();

const encryptMessage = async (data: string, passwords: string): Promise<WebStream<string>> => {
  return encrypt({
    message: await createMessage({ text: data }),
    passwords,
  });
};

const randomString = (length: number) => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
};

type Values = {
  message: string;
  expiration: string;
  onetime: boolean;
};

const EncryptMessage = () => {
  const { pop } = useNavigation();
  const [messageError, setMessageError] = useState<string | undefined>();

  const dropMessageErrorIfNeeded = () => {
    if (messageError && messageError.length > 0) {
      setMessageError(undefined);
    }
  };

  const submitEncryptMessage = async (values: Values) => {
    try {
      if (values.message.length === 0) {
        setMessageError("The field should't be empty!");
      } else {
        const password = randomString(24);

        const response = await fetch(`${preferences.apiUrl}/secret`, {
          method: "post",
          body: JSON.stringify({
            expiration: parseInt(values.expiration),
            message: await encryptMessage(values.message, password),
            one_time: values.onetime,
          }),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json: any = await response.json();

        if (response.status === 200 && json.message) {
          const url = `${preferences.url}/#/s/${json.message}/${password}`;
          await Clipboard.copy(url);

          showToast({ style: Toast.Style.Success, title: "Link copied to clipboard", message: url });
          pop();
        } else {
          throw new Error(JSON.stringify(json));
        }
      }
    } catch (err) {
      showToast({ style: Toast.Style.Failure, title: "An error occured", message: err.message });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encrypt Message" icon={Icon.Fingerprint} onSubmit={submitEncryptMessage} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Message"
        placeholder="Enter your secret message"
        error={messageError}
        onChange={dropMessageErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setMessageError("The field should't be empty!");
          } else {
            dropMessageErrorIfNeeded();
          }
        }}
      />
      <Form.Separator />
      <Form.Dropdown id="expiration" title="Delete After">
        <Form.Dropdown.Item value="3600" title="One Hour" />
        <Form.Dropdown.Item value="86400" title="One Day" />
        <Form.Dropdown.Item value="604800" title="One Week" />
      </Form.Dropdown>
      <Form.Checkbox id="onetime" title="One-Time Download" label="" storeValue />
    </Form>
  );
};

export default EncryptMessage;
