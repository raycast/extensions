// AuthenticateForm.tsx
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  LocalStorage,
  List,
} from "@raycast/api";
import { useState } from "react";
import { authenticateWithDexcom } from "./auth";
import { LoadingState } from "./types";

export default function AuthenticateForm() {
  const [accountName, setAccountName] = useState("");
  const [password, setPassword] = useState("");
  const [isNorthAmerica, setIsNorthAmerica] = useState(true);
  const [loadingState, setLoadingState] = useState(LoadingState.Idle);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setLoadingState(LoadingState.Loading);
    await LocalStorage.setItem("isNorthAmerica", isNorthAmerica);
    try {
      const sessionId = await authenticateWithDexcom(
        accountName,
        password,
        isNorthAmerica,
      );
      if (sessionId) {
        await showToast({
          style: Toast.Style.Success,
          title: "Authenticated Successfully",
        });
      }
      setLoadingState(LoadingState.Success);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      setLoadingState(LoadingState.Error);
    }
  }

  if (loadingState === LoadingState.Error) {
    return (
      <List>
        <List.Item title="Error" subtitle={errorMessage ?? "Unknown error"} />
      </List>
    );
  }

  if (loadingState === LoadingState.Success) {
    return (
      <List>
        <List.Item title="Success" subtitle="Authenticated Successfully" />
      </List>
    );
  }

  return (
    <Form
      isLoading={loadingState === LoadingState.Loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Authenticate" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="accountName"
        title="Account Name"
        placeholder="Enter your Dexcom account name"
        value={accountName}
        onChange={setAccountName}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="Enter your Dexcom password"
        value={password}
        onChange={setPassword}
      />
      <Form.Checkbox
        id="isNorthAmerica"
        title="North America"
        label="North America"
        value={isNorthAmerica}
        onChange={setIsNorthAmerica}
      />
    </Form>
  );
}
