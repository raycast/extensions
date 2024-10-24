import { Action, ActionPanel, Form, showToast, Toast, Detail, useNavigation, getPreferenceValues } from "@raycast/api";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";
import webpush from "web-push";

interface GenerateVapidKeysFormValues {
  email: string;
}

async function generateVapidKeys(email: string) {
  const vapidKeys = webpush.generateVAPIDKeys();
  const publicKey = vapidKeys.publicKey;
  const privateKey = vapidKeys.privateKey;

  await showToast({
    style: Toast.Style.Success,
    title: "VAPID keys generated",
  });

  return {
    email,
    publicKey,
    privateKey,
  };
}

export default function Command() {
  const { email } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();

  const { isLoading, setValue } = useLocalStorage("vapid-keys", {
    email: "",
    publicKey: "",
    privateKey: "",
  });

  const { handleSubmit, itemProps } = useForm<GenerateVapidKeysFormValues>({
    async onSubmit(values) {
      const { email } = values;
      const { publicKey, privateKey } = await generateVapidKeys(email);

      const markdown = `# Generated VAPID Keys for ${email}
 
      \n ### publicKey:
      \`${publicKey}\`
      \n ### privateKey:
      \`${privateKey}\`
      `;

      // Display the generated keys in a toast or handle them as needed
      await showToast({
        style: Toast.Style.Success,
        title: "VAPID Keys",
        message: markdown,
      });

      await setValue({ email, publicKey, privateKey });
      push(<Details />);
      return;
    },
    validation: {
      email: FormValidation.Required,
    },
    initialValues: {
      email,
    },
  });

  return (
    <Form
      enableDrafts={true}
      isLoading={isLoading}
      navigationTitle={"Generate VAPID Keys"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Vapid Keys" onSubmit={handleSubmit} />
          <Action title="View Generated Keys" onAction={() => push(<Details />)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        defaultValue={email}
        title="Email"
        placeholder="Enter email"
        storeValue={true}
        {...itemProps.email}
      />
    </Form>
  );
}

function Details() {
  const { value: vapidKeys, isLoading } = useLocalStorage("vapid-keys", {
    email: "",
    publicKey: "",
    privateKey: "",
  });
  const { pop } = useNavigation();

  const markdown = `# Generated VAPID Keys for ${vapidKeys?.email}
 
  \n ### Use the following keys in your application:
  \n ### publicKey:
  \`${vapidKeys?.publicKey}\`
  \n ### privateKey:
  \`${vapidKeys?.privateKey}\`
  `;
  // ADd action to redirect to the generated keys
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Generate Again" onAction={() => pop()} />
        </ActionPanel>
      }
    />
  );
}
