import { Form, ActionPanel, Action, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { SecretStore } from "../types";
import { createSecret, recreateSecret } from "../api";
import { FormValidation, useForm } from "@raycast/utils";
import * as crypto from "crypto";

interface SecretFormProps {
  store: SecretStore;
  secretName?: string;
  onSaved?: () => void;
}

function generateRandomSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function SecretForm({ store, secretName, onSaved }: SecretFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const isRotating = !!secretName;

  const { handleSubmit, itemProps, setValue } = useForm<{ name: string; secret: string }>({
    async onSubmit(values) {
      try {
        setIsLoading(true);
        const name = isRotating ? secretName! : values.name;

        if (isRotating) {
          await recreateSecret(store.id, name, values.secret);
        } else {
          await createSecret(store.id, name, values.secret);
        }

        await showToast({
          style: Toast.Style.Success,
          title: isRotating ? "Secret rotated" : "Secret created",
          message: name,
        });
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isRotating ? "Failed to rotate secret" : "Failed to create secret",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: secretName || "",
      secret: "",
    },
    validation: {
      name: isRotating ? undefined : FormValidation.Required,
      secret: FormValidation.Required,
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isRotating ? `Rotate ${secretName}` : `New Secret in ${store.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isRotating ? "Rotate Secret" : "Create Secret"} onSubmit={handleSubmit} />
          <Action
            title="Generate Random Value"
            icon={Icon.Wand}
            onAction={() => setValue("secret", generateRandomSecret())}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "g" },
              Windows: { modifiers: ["ctrl"], key: "g" },
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Store: ${store.name}`} />
      {isRotating ? (
        <Form.Description text={`Secret: ${secretName}`} />
      ) : (
        <Form.TextField title="Secret Name" placeholder="e.g. DATABASE_URL, API_KEY" {...itemProps.name} />
      )}
      <Form.PasswordField
        title="Secret Value"
        placeholder="Enter secret value"
        info={`This value will be encrypted and cannot be retrieved after creation. Press Cmd+G (macOS) or Ctrl+G (Windows) to generate a random value.`}
        {...itemProps.secret}
      />
    </Form>
  );
}
