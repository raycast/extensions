import { Action, ActionPanel, Clipboard, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";

interface VaultResponse {
  decryptedValue: string;
  reads: number;
  ttl: string;
}

interface DecryptFormValues {
  vaultUrl: string;
  password?: string;
}

function DecryptResult({ data }: { data: VaultResponse }) {
  const markdown = `
## Decrypted Value
\`\`\`
${data.decryptedValue}
\`\`\`

**Reads left:** ${data.reads}
**Time left:** ${data.ttl}

The decrypted value has been automatically copied to your clipboard.
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.CopyClipboard}
            title="Copy Decrypted Value"
            onAction={async () => {
              await Clipboard.copy(data.decryptedValue);
              await showToast({
                title: "Copied to clipboard",
                style: Toast.Style.Success,
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const { handleSubmit, itemProps } = useForm<DecryptFormValues>({
    async onSubmit(values) {
      setIsLoading(true);

      try {
        await showToast({
          title: "Decrypting...",
          message: "Retrieving secret from vault",
          style: Toast.Style.Animated,
        });

        const secretId = extractSecretId(values.vaultUrl);

        if (!secretId) {
          throw new Error("Could not extract secret ID from the provided input. Please check the format.");
        }

        const requestBody: { password?: string } = {};
        if (values.password && values.password.trim()) {
          requestBody.password = values.password;
        }

        const response = await fetch(`https://vault.shelve.cloud/api/vault?id=${secretId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = "Failed to decrypt secret";

          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.statusMessage || errorMessage;
          } catch {
            if (response.status === 404) {
              errorMessage = "Secret not found. It may have expired or been fully consumed.";
            } else if (response.status === 429) {
              errorMessage = "Rate limit exceeded. Please try again later.";
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
          }

          throw new Error(errorMessage);
        }

        const data = (await response.json()) as VaultResponse;

        await Clipboard.copy(data.decryptedValue);

        await showToast({
          title: "Secret Decrypted!",
          message: "Value copied to clipboard",
          style: Toast.Style.Success,
        });

        push(<DecryptResult data={data} />);
      } catch (error) {
        await showToast({
          title: "Decryption failed",
          message: error instanceof Error ? error.message : "Failed to decrypt secret",
          style: Toast.Style.Failure,
        });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      vaultUrl: (value) => {
        if (!value?.trim()) {
          return "Vault URL or ID is required";
        }

        // Basic validation for supported formats
        const trimmedValue = value.trim();
        const isUrl = trimmedValue.startsWith("https://vault.shelve.cloud");
        const isId = /^[a-zA-Z0-9_-]+$/.test(trimmedValue);

        if (!isUrl && !isId) {
          return "Please enter a valid vault URL or secret ID";
        }
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decrypt Secret" onSubmit={handleSubmit} icon={Icon.LockUnlocked} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter a vault URL or secret ID to decrypt and retrieve the secret." />

      <Form.TextField
        {...itemProps.vaultUrl}
        title="Vault URL or Secret ID"
        placeholder="Enter your share ID (e.g. o75adqf...)"
        info="You can paste either the full vault URL or just the secret ID. The secret will be automatically copied to your clipboard upon successful decryption."
      />

      <Form.PasswordField
        {...itemProps.password}
        title="Password (Optional)"
        placeholder="Leave empty if not password-protected"
        info="Enter password if the secret is password-protected. Leave empty otherwise."
      />
    </Form>
  );
}

function extractSecretId(input: string): string | null {
  const trimmedInput = input.trim();

  if (trimmedInput.startsWith("https://vault.shelve.cloud")) {
    // Handle https://vault.shelve.cloud?id={id}
    const queryMatch = trimmedInput.match(/https:\/\/vault\.shelve\.cloud(?:\/)?(?:\?|&)id=([^&\s]+)/);
    if (queryMatch) {
      return queryMatch[1];
    }

    // Handle https://vault.shelve.cloud/secret/{id}
    const secretMatch = trimmedInput.match(/https:\/\/vault\.shelve\.cloud\/secret\/([^/?]+)/);
    if (secretMatch) {
      return secretMatch[1];
    }

    return null;
  } else {
    // Assume it's just the ID - validate it's a reasonable format
    if (/^[a-zA-Z0-9_-]+$/.test(trimmedInput)) {
      return trimmedInput;
    }
  }

  return null;
}
