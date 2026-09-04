import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { connectWifi } from "../services/wifiService";

interface ConnectPasswordFormProps {
  ssid: string;
  onConnected?: () => void;
}

export function ConnectPasswordForm({
  ssid,
  onConnected,
}: ConnectPasswordFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { password?: string }) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${ssid}...`,
    });

    try {
      await connectWifi(ssid, values.password);
      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${ssid}`;
      if (onConnected) onConnected();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to connect";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Join ${ssid}`} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Network"
        text={`Enter Wi-Fi password for "${ssid}"`}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter Wi-Fi network password"
        autoFocus
      />
    </Form>
  );
}
