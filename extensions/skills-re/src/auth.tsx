import { Action, ActionPanel, Alert, closeMainWindow, confirmAlert, Form, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { getErrorMessage } from "./api-error";
import { getApiToken, removeApiToken, setApiToken } from "./api-token";

export const API_KEY_SETTINGS_URL = "https://skills.re/dashboard/settings";

export function ApiTokenForm() {
  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState<string>();
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadToken = async () => {
      try {
        const storedToken = await getApiToken();
        if (isMounted) {
          setToken(storedToken ?? "");
          setHasStoredToken(Boolean(storedToken));
        }
      } catch (error) {
        await showToast({
          message: getErrorMessage(error),
          style: Toast.Style.Failure,
          title: "Could not load API token",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveToken = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setTokenError("Enter an API token or skip setup for now.");
      return;
    }

    setIsLoading(true);
    try {
      await setApiToken(trimmedToken);
      await showToast({
        style: Toast.Style.Success,
        title: hasStoredToken ? "API token updated" : "API token saved",
      });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        message: getErrorMessage(error),
        style: Toast.Style.Failure,
        title: "Could not save API token",
      });
      setIsLoading(false);
    }
  };

  const removeToken = async () => {
    const confirmed = await confirmAlert({
      message: "AI Search, Saved Skills, and saving skills will require setup again.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Remove Token",
      },
      title: "Remove API Token?",
    });
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await removeApiToken();
      await showToast({
        style: Toast.Style.Success,
        title: "API token removed",
      });
      await closeMainWindow();
    } catch (error) {
      await showToast({
        message: getErrorMessage(error),
        style: Toast.Style.Failure,
        title: "Could not remove API token",
      });
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title={hasStoredToken ? "Update Token" : "Save Token"}
            onSubmit={saveToken}
          />
          <Action.OpenInBrowser icon={Icon.Globe} title="Generate Token" url={API_KEY_SETTINGS_URL} />
          <Action icon={Icon.ArrowRight} title="Skip for Now" onAction={closeMainWindow} />
          {hasStoredToken ? (
            <Action icon={Icon.Trash} style={Action.Style.Destructive} title="Remove Token" onAction={removeToken} />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        text="Add a skills.re API token to use AI Search, save skills, and manage your saved library. You can skip this step and continue using public keyword search."
        title="Welcome to Skills.re"
      />
      <Form.Separator />
      <Form.PasswordField
        error={tokenError}
        id="token"
        placeholder="Paste your skills.re API token"
        title="API Token"
        value={token}
        onChange={(value) => {
          setToken(value);
          if (tokenError) {
            setTokenError(undefined);
          }
        }}
      />
    </Form>
  );
}

export default function Command() {
  return <ApiTokenForm />;
}
