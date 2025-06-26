import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { setLocalStorageItem } from "@raycast/api";
import { ReadwiseAPI } from "./api/readwise";
import { WeReadAPI } from "./api/weread";

interface FormValues {
  wereadCookie: string;
  readwiseToken: string;
  autoSyncEnabled: boolean;
  autoSyncInterval: string;
}

export default function Settings() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      try {
        // Test WeRead connection
        if (values.wereadCookie) {
          const wereadApi = new WeReadAPI(values.wereadCookie);
          await wereadApi.getNotebooks();
          await showToast({
            style: Toast.Style.Success,
            title: "WeRead Connected",
            message: "WeRead cookie is valid",
          });
        }

        // Test Readwise connection
        if (values.readwiseToken) {
          const readwiseApi = new ReadwiseAPI(values.readwiseToken);
          const isValid = await readwiseApi.testConnection();
          if (isValid) {
            await showToast({
              style: Toast.Style.Success,
              title: "Readwise Connected",
              message: "Readwise token is valid",
            });
          }
        }

        // Save credentials and auto-sync settings
        await setLocalStorageItem("wereadCookie", values.wereadCookie);
        await setLocalStorageItem("readwiseToken", values.readwiseToken);
        await setLocalStorageItem("autoSyncEnabled", JSON.stringify(values.autoSyncEnabled));
        await setLocalStorageItem("autoSyncInterval", values.autoSyncInterval);

        await showToast({
          style: Toast.Style.Success,
          title: "Settings Saved",
          message: "Authentication credentials updated successfully",
        });

        pop();
      } catch (error) {
        console.error("Settings validation failed:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Failed",
          message: error instanceof Error ? error.message : "Please check your credentials",
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      wereadCookie: FormValidation.Required,
      readwiseToken: FormValidation.Required,
    },
    initialValues: {
      wereadCookie: "",
      readwiseToken: "",
      autoSyncEnabled: false,
      autoSyncInterval: "daily",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Settings" onSubmit={handleSubmit} />
          <Action
            title="How to Get Weread Cookie"
            onAction={() => {
              showToast({
                style: Toast.Style.Animated,
                title: "WeRead Cookie Instructions",
                message:
                  "1. Open WeRead in browser\n2. Login to your account\n3. Open DevTools (F12)\n4. Go to Network tab\n5. Refresh page\n6. Copy Cookie header from any request",
              });
            }}
          />
          <Action
            title="How to Get Readwise Token"
            onAction={() => {
              showToast({
                style: Toast.Style.Animated,
                title: "Readwise Token Instructions",
                message: "1. Go to readwise.io/access_token\n2. Login to your account\n3. Copy your access token",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Configure your WeRead and Readwise credentials to enable sync functionality." />

      <Form.TextArea
        title="WeRead Cookie"
        placeholder="Paste your WeRead cookie here..."
        info="Get this from your browser's DevTools when logged into WeRead"
        {...itemProps.wereadCookie}
      />

      <Form.TextField
        title="Readwise Access Token"
        placeholder="Enter your Readwise access token..."
        info="Get this from readwise.io/access_token"
        {...itemProps.readwiseToken}
      />

      <Form.Separator />

      <Form.Description text="Auto-sync automatically checks for new highlights and syncs them to Readwise at regular intervals." />

      <Form.Checkbox
        title="Enable Auto-sync"
        label="Automatically sync new highlights to Readwise"
        {...itemProps.autoSyncEnabled}
      />

      <Form.Dropdown title="Sync Interval" info="How often to check for new highlights" {...itemProps.autoSyncInterval}>
        <Form.Dropdown.Item value="hourly" title="Every Hour" />
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
      </Form.Dropdown>
    </Form>
  );
}
