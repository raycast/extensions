// store-secret.tsx
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import { useState } from "react";

interface FormValues {
  token: string;
  orgName: string;
}

export async function storeSecretAndOrg(token: string, orgName: string) {
  try {
    await LocalStorage.setItem("pdq_api_token", token);
    await LocalStorage.setItem("pdq_org_name", orgName);
    await showToast({
      style: Toast.Style.Success,
      title: "API token and organization name stored successfully",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to store API token and organization name",
    });
    console.error(error);
  }
}

export async function getStoredSecret(): Promise<string | null> {
  return LocalStorage.getItem("pdq_api_token");
}

export async function getStoredOrgName(): Promise<string | null> {
  return LocalStorage.getItem("pdq_org_name");
}

export default function Command() {
  const [tokenError, setTokenError] = useState<string | undefined>();
  const [orgNameError, setOrgNameError] = useState<string | undefined>();

  async function handleSubmit(values: FormValues) {
    if (!values.token.trim()) {
      setTokenError("API Token is required");
      return;
    }
    if (!values.orgName.trim()) {
      setOrgNameError("Organization Name is required");
      return;
    }
    await storeSecretAndOrg(values.token.trim(), values.orgName.trim());
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Details" />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="token"
        title="PDQ API Token"
        error={tokenError}
        onChange={() => setTokenError(undefined)}
      />
      <Form.TextField
        id="orgName"
        title="Organization Name"
        error={orgNameError}
        onChange={() => setOrgNameError(undefined)}
      />
    </Form>
  );
}
