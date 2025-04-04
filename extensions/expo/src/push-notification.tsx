import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { NotificationResponse, PushNotificationPayload } from "./lib/types/notification.types";
import axios, { AxiosRequestConfig } from "axios";
import { baseHeaders } from "./lib/constants";

export default function PushNotification() {
  async function handleSubmitForm(values: PushNotificationPayload) {
    // testRequest();
    // return;
    try {
      // Validate data field if provided
      let dataObject = undefined;
      if (values.data && values.data.trim() !== "") {
        try {
          dataObject = JSON.parse(values.data);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid JSON in data field",
            message: "Please check your JSON format",
          });
          return;
        }
      }

      // Prepare payload
      const payload = JSON.stringify({
        to: values.to,
        title: values.title,
        body: values.body,
        ...(values.subtitle && { subtitle: values.subtitle }),
        ...(values.badge && { badge: Number(values.badge) }),
        ...(values.sound !== false && { sound: "default" }),
        ...(values.ttl && { ttl: Number(values.ttl) }),
        ...(values.channelId && { channelId: values.channelId }),
        ...(dataObject && { data: dataObject }),
      });

      const config: AxiosRequestConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://api.expo.dev/v2/push/send",
        data: payload,
        headers: {
          ...baseHeaders,
          Authorization: `Bearer ${values.accessToken}`,
        },
        withCredentials: true,
      };

      const resp = await axios.request<NotificationResponse>(config);

      if ("error" in resp.data) {
        showToast({
          title: resp.data.error,
          message: resp.data.error_description,
          style: Toast.Style.Failure,
        });
      } else {
        if (resp.data.data.status === "ok") {
          showToast({
            style: Toast.Style.Success,
            title: "Notification Sent",
            message: "Push notification sent successfully",
          });
        } else {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to send push notification",
            message: "Unknown error occurred",
          });
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Send Notification",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  const { handleSubmit, itemProps } = useForm<PushNotificationPayload>({
    onSubmit: handleSubmitForm,
    validation: {
      to: FormValidation.Required,
      title: FormValidation.Required,
      body: FormValidation.Required,
      accessToken: FormValidation.Required,
      data: (value) => {
        if (!value || value.trim() === "") return;
        try {
          JSON.parse(value);
          return undefined;
        } catch (error) {
          return "Invalid JSON format";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Notification" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.TextField
        {...itemProps.to}
        title="Recipient"
        placeholder="ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
        info="Expo push token from your app"
      />

      <Form.TextField
        {...itemProps.accessToken}
        title="Access Token"
        placeholder=""
        info="Required, if you have enabled push security"
      />

      <Form.TextField {...itemProps.title} title="Message Title" placeholder="" info="The title of the notification" />

      <Form.TextField {...itemProps.body} title="Message Body" placeholder="" info="The content of the notification" />

      <Form.Separator />

      <Form.Description text="Optional Fields" />

      <Form.TextField
        {...itemProps.subtitle}
        title="Subtitle (iOS)"
        placeholder="Notification subtitle"
        info="The subtitle of the notification (iOS only)"
      />

      <Form.TextField
        {...itemProps.badge}
        title="Badge count (iOS)"
        placeholder="1"
        info="The number to display in the badge on the app icon"
      />

      <Form.Checkbox
        {...itemProps.sound}
        title="Sound"
        label="Play sound with notification"
        info="Enable sound when the notification is received"
      />

      <Form.TextField {...itemProps.ttl} title="TTL" placeholder="3600" info="Time to live in seconds" />

      <Form.TextArea
        {...itemProps.data}
        title="Data"
        placeholder='{"key": "value"}'
        info="Additional data to send with the notification (JSON format)"
      />

      <Form.TextField
        {...itemProps.channelId}
        title="Channel ID (Android)"
        placeholder="default"
        info="The channel ID for Android notifications"
      />
    </Form>
  );
}
