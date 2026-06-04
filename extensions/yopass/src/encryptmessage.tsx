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
import { FormValidation, useForm } from "@raycast/utils";
import { encrypt, createMessage, WebStream } from "openpgp";

const preferences = getPreferenceValues<Preferences>();

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

  const submitEncryptMessage = async (values: Values) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Encrypting" });
    try {
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

        toast.style = Toast.Style.Success;
        toast.title = "Link copied to clipboard";
        toast.message = url;
        pop();
      } else {
        throw new Error(JSON.stringify(json));
      }
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "An error occurred";
      toast.message = `${err}`;
    }
  };

  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit: submitEncryptMessage,
    validation: {
      message: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encrypt Message" icon={Icon.Fingerprint} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Message" placeholder="Enter your secret message" {...itemProps.message} />
      <Form.Separator />
      <Form.Dropdown title="Delete After" {...itemProps.expiration}>
        <Form.Dropdown.Item value="3600" title="One Hour" />
        <Form.Dropdown.Item value="86400" title="One Day" />
        <Form.Dropdown.Item value="604800" title="One Week" />
      </Form.Dropdown>
      <Form.Checkbox title="One-Time Download" label="" storeValue {...itemProps.onetime} />
    </Form>
  );
};

export default EncryptMessage;
