import { Action, ActionPanel, Form, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation, useLocalStorage } from "@raycast/utils";
import { useEffect } from "react";

export interface NotificationProps {
  email: string;
  publicKey: string;
  privateKey: string;
  endpoint: string;
  p256dh: string;
  auth: string;
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

  const { handleSubmit, itemProps, setValue } = useForm<NotificationProps>({
    async onSubmit() {
      if (!itemProps.email.value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Email Required",
          message: "Email is required to save preferences",
        });
        return;
      }
      if (!itemProps.publicKey.value || !itemProps.privateKey.value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Public Key Required",
          message: "Public Key is required to save preferences",
        });
        return;
      }

      if (!itemProps.endpoint.value || !itemProps.p256dh.value || !itemProps.auth.value) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Endpoint Required",
          message: "Endpoint is required to save preferences",
        });
        return;
      }

      await setVapidKeys({
        email: itemProps.email.value,
        publicKey: itemProps.publicKey.value,
        privateKey: itemProps.privateKey.value,
        endpoint: itemProps.endpoint.value,
        p256dh: itemProps.p256dh.value,
        auth: itemProps.auth.value,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Preferences Saved",
        message: "Your preferences have been saved successfully",
      });
      console.log("Preferences saved", {
        email: itemProps.email.value,
        publicKey: itemProps.publicKey.value,
        privateKey: itemProps.privateKey.value,
        endpoint: itemProps.endpoint.value,
        p256dh: itemProps.p256dh.value,
        auth: itemProps.auth.value,
      });
    },
    validation: {
      email: FormValidation.Required,
      publicKey: FormValidation.Required,
      privateKey: FormValidation.Required,
      endpoint: FormValidation.Required,
      p256dh: FormValidation.Required,
      auth: FormValidation.Required,
    },
    initialValues: vapidKeys,
  });

  useEffect(() => {
    setValue("email", vapidKeys?.email as string);
    setValue("publicKey", vapidKeys?.publicKey as string);
    setValue("privateKey", vapidKeys?.privateKey as string);
    setValue("endpoint", vapidKeys?.endpoint as string);
    setValue("p256dh", vapidKeys?.p256dh as string);
    setValue("auth", vapidKeys?.auth as string);
  }, [vapidKeys?.email, setValue]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Email
      "
        storeValue={true}
        placeholder="Enter email"
        {...itemProps.email}
      />
      <Form.TextField storeValue={true} title="Public Key" placeholder="Enter public key" {...itemProps.publicKey} />
      <Form.TextField storeValue={true} title="Private Key" placeholder="Enter private key" {...itemProps.privateKey} />
      <Form.TextField storeValue={true} title="Endpoint" placeholder="Enter endpoint" {...itemProps.endpoint} />
      <Form.TextField storeValue={true} title="p256dh" placeholder="Enter p256dh" {...itemProps.p256dh} />
      <Form.TextField storeValue={true} title="Auth" placeholder="Enter auth" {...itemProps.auth} />
    </Form>
  );
}
