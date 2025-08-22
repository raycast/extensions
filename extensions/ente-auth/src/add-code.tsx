import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { getStorageService } from "./services/storage";
import { AuthData } from "./types";
import Index from "./index";

export default function AddCode() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (values: {
    name: string;
    issuer?: string;
    secret: string;
    type: string;
    algorithm: string;
    digits: string;
    period?: string;
    counter?: string;
  }) => {
    if (!values.name || !values.secret) {
      setError("Name and Secret are required");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Adding authenticator code...",
      });

      // Get storage service
      const storage = getStorageService();

      // Get current entities
      const entities = await storage.getAuthEntities();

      // Create new auth data
      const newAuthData: AuthData = {
        id: `manual-${Date.now()}`,
        name: values.name,
        issuer: values.issuer,
        secret: values.secret.replace(/\s/g, "").toUpperCase(),
        type: (values.type || "totp") as "totp" | "hotp" | "steam",
        algorithm: (values.algorithm || "sha1") as "sha1" | "sha256" | "sha512",
        digits: parseInt(values.digits || "6", 10),
        period: parseInt(values.period || "30", 10),
        counter: values.type === "hotp" ? parseInt(values.counter || "0", 10) : undefined,
        updatedAt: Date.now(),
      };

      // Add to entities
      entities.push(newAuthData);

      // Store updated entities
      await storage.storeAuthEntities(entities);

      toast.style = Toast.Style.Success;
      toast.title = "Authenticator code added successfully!";

      // Navigate to the main screen
      push(<Index />);
    } catch (error) {
      console.error("Add code error:", error);

      if (error instanceof Error) {
        setError(error.message);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add authenticator code",
          message: error.message,
        });
      } else {
        setError("An unknown error occurred");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to add authenticator code",
          message: "An unknown error occurred",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Code" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="name" title="Account Name" placeholder="e.g. GitHub, Gmail" error={error} autoFocus />
      <Form.TextField id="issuer" title="Issuer (Optional)" placeholder="e.g. Google, Microsoft" />
      <Form.TextField id="secret" title="Secret Key" placeholder="Enter base32 secret key" />
      <Form.Dropdown id="type" title="Type" defaultValue="totp">
        <Form.Dropdown.Item value="totp" title="TOTP (Time-Based)" />
        <Form.Dropdown.Item value="hotp" title="HOTP (Counter-Based)" />
        <Form.Dropdown.Item value="steam" title="Steam" />
      </Form.Dropdown>
      <Form.Dropdown id="algorithm" title="Algorithm" defaultValue="sha1">
        <Form.Dropdown.Item value="sha1" title="SHA-1" />
        <Form.Dropdown.Item value="sha256" title="SHA-256" />
        <Form.Dropdown.Item value="sha512" title="SHA-512" />
      </Form.Dropdown>
      <Form.Dropdown id="digits" title="Digits" defaultValue="6">
        <Form.Dropdown.Item value="6" title="6 digits" />
        <Form.Dropdown.Item value="8" title="8 digits" />
      </Form.Dropdown>
      <Form.TextField id="period" title="Period (seconds)" placeholder="30" />
      <Form.TextField id="counter" title="Counter (HOTP only)" placeholder="0" />
      <Form.Description text="Note: Manually added codes are stored locally and won't sync with your Ente account." />
    </Form>
  );
}
