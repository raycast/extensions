import { Action, ActionPanel, Form, showToast, Toast, Detail, useNavigation } from "@raycast/api";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";
import webpush from "web-push";
import { useEffect } from "react";
import { NotificationProps } from "./setup";

interface VapidKeysFormValues {
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
  const {
    value: vapidKeys,
    setValue: setVapidKeys,
    isLoading,
  } = useLocalStorage<NotificationProps>("vapid-keys", {
    email: "",
    publicKey: "",
    privateKey: "",
    endpoint: "",
    p256dh: "",
    auth: "",
  });
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<VapidKeysFormValues>({
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

      await setVapidKeys({
        email,
        publicKey,
        privateKey,
        endpoint: "",
        p256dh: "",
        auth: "",
      });
      push(<Details />);
      return;
    },
    validation: {
      email: FormValidation.Required,
    },
    initialValues: vapidKeys,
  });

  useEffect(() => {
    if (vapidKeys?.privateKey) {
      push(<Details />);
    }
  }, [vapidKeys?.privateKey, push]);

  return (
    <Form
      enableDrafts={true}
      isLoading={isLoading}
      navigationTitle={"Generate VAPID Keys"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Vapid Keys" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email" placeholder="Enter email" storeValue={true} {...itemProps.email} />
    </Form>
  );
}

function Details() {
  const { value: vapidKeys, isLoading } = useLocalStorage("vapid-keys", {
    email: "",
    publicKey: "",
    privateKey: "",
  });

  const markdown = `# Generated VAPID Keys for ${vapidKeys?.email}
 
  \n ### Use the following keys in your application:
  \n ### publicKey:
  \`${vapidKeys?.publicKey}\`
  \n ### privateKey:
  \`${vapidKeys?.privateKey}\`
  `;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
