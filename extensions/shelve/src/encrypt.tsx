import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";

interface EncryptFormValues {
  secret: string;
  reads: string;
  ttl: string;
  password?: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<EncryptFormValues>({
    initialValues: {
      secret: "",
      reads: "1",
      ttl: "1d",
      password: "",
    },
    async onSubmit(values) {
      setIsLoading(true);

      try {
        // Show loading toast
        await showToast({
          title: "Encrypting...",
          message: "Sending your secret to the vault",
          style: Toast.Style.Animated,
        });

        const requestBody: {
          value: string;
          reads: number;
          ttl: string;
          password?: string;
        } = {
          value: values.secret,
          reads: parseInt(values.reads, 10),
          ttl: values.ttl,
        };

        if (values.password && values.password.trim()) {
          requestBody.password = values.password;
        }

        const response = await fetch("https://vault.shelve.cloud/api/vault", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to encrypt secret";

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.statusMessage || errorMessage;
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        const vaultUrl = await response.text();

        await Clipboard.copy(vaultUrl);

        await showToast({
          title: "Secret encrypted!",
          message: "URL copied to clipboard",
          style: Toast.Style.Success,
        });
      } catch (error) {
        await showToast({
          title: "Encryption failed",
          message: error instanceof Error ? error.message : "Failed to encrypt secret",
          style: Toast.Style.Failure,
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      secret: FormValidation.Required,
      reads: (value) => {
        if (!value) {
          return "Number of reads is required";
        }
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num < 1 || num > 100) {
          return "Must be a number between 1 and 100";
        }
      },
      ttl: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Encrypt Secret" icon={Icon.Lock} />
        </ActionPanel>
      }
    >
      <Form.Description text="Share secrets securely without an account. Set expiration time and control number of reads." />

      <Form.TextArea
        {...itemProps.secret}
        title="Secret"
        placeholder="Enter your secret text, password, or sensitive information"
        info="The text you want to encrypt and share securely. This will be encrypted before transmission."
      />

      <Form.TextField
        {...itemProps.reads}
        title="Maximum Reads"
        placeholder="1"
        info="How many times the secret can be accessed before it's automatically deleted (1-100)"
      />

      <Form.Dropdown
        {...itemProps.ttl}
        title="Time to Live (TTL)"
        info="How long the secret remains accessible before automatic expiration"
      >
        <Form.Dropdown.Item value="1d" title="1 Day" />
        <Form.Dropdown.Item value="7d" title="7 Days" />
        <Form.Dropdown.Item value="30d" title="30 Days" />
        <Form.Dropdown.Item value="Infinite" title="Infinite" />
      </Form.Dropdown>

      <Form.PasswordField
        {...itemProps.password}
        title="Password (Optional)"
        placeholder="Leave empty for no password"
        info="Optional password to protect the secret. Recipients will need this password to decrypt."
      />
    </Form>
  );
}
