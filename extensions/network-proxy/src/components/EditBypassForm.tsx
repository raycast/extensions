import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { NetworkUtils } from "../utils/network";

interface EditBypassFormProps {
  currentValue: string;
  service: string;
  onSave: () => void;
}

export function EditBypassForm({ currentValue, service, onSave }: EditBypassFormProps) {
  const [value, setValue] = useState(currentValue);
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Set bypass domains
      await NetworkUtils.setProxyBypassDomains(service, value);

      await showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: "Bypass domains updated successfully",
      });

      onSave();
      pop(); // Return to previous page (Show Network Proxy)
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update bypass domains",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSave} title="Save" />
          <Action title="Cancel" onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="bypassDomains"
        title="Bypass Domains"
        placeholder="localhost, 127.0.0.1, *.local, 192.168.*.*, mydomain.com"
        value={value}
        onChange={setValue}
        info="Enter domains that should bypass the proxy. Use comma-separated list. Supports wildcards like *.local"
      />

      <Form.Description
        title="Examples"
        text="localhost - Local machine
127.0.0.1 - Loopback address  
*.local - All .local domains
192.168.*.* - Local network range
company.internal - Internal domain"
      />
    </Form>
  );
}
