import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { checkApiTokenValidity, displayCode, getToken } from "../api";
import { apiAppName, downloadUrl, localStorageKeys } from "../utils";

type EnsureAuthenticatedProps = {
  placeholder?: string;
  viewType: "list" | "form";
  children: React.ReactNode;
};

export function EnsureAuthenticated({ placeholder, viewType, children }: EnsureAuthenticatedProps) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [tokenIsValid, setTokenIsValid] = useState<boolean>(false);
  const [challengeId, setChallengeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps } = useForm<{ code: string }>({
    onSubmit: async (values) => {
      if (!challengeId) {
        await showFailureToast({
          title: "Pairing not started",
          message: "Start the pairing before submitting the code.",
        });
        return;
      }

      try {
        setIsLoading(true);
        const { app_key } = await getToken(challengeId, values.code);
        await LocalStorage.setItem(localStorageKeys.appKey, app_key);
        await showToast({ style: Toast.Style.Success, title: "Successfully paired" });
        setHasToken(true);
        setTokenIsValid(true);
      } catch (error) {
        await showFailureToast(error, { title: "Failed to pair" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      code: (value) => {
        if (!value) {
          return "The code is required.";
        } else if (!/^\d{4}$/.test(value)) {
          return "Code must be exactly 4 digits.";
        }
      },
    },
  });

  useEffect(() => {
    const retrieveAndValidateToken = async () => {
      const token = await LocalStorage.getItem<string>(localStorageKeys.appKey);
      if (token) {
        const isValid = await checkApiTokenValidity();
        setHasToken(true);
        setTokenIsValid(isValid);
      } else {
        setHasToken(false);
      }
    };
    retrieveAndValidateToken();
  }, []);

  async function startChallenge() {
    try {
      setIsLoading(true);
      const { challenge_id } = await displayCode(apiAppName);
      setChallengeId(challenge_id);

      // Prevent window from closing
      await showToast({
        style: Toast.Style.Animated,
        title: "Pairing started",
        message: "Check the app for the 4-digit code.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start pairing",
        message: error instanceof Error ? error.message : "An unknown error occurred.",
        primaryAction: {
          title: "Open Anytype",
          shortcut: Keyboard.Shortcut.Common.Open,
          onAction: async () => {
            await open(getPreferenceValues().anytypeApp.path);
          },
        },
        secondaryAction: {
          title: "Download Anytype",
          shortcut: Keyboard.Shortcut.Common.OpenWith,
          onAction: async () => {
            await open(downloadUrl);
          },
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (hasToken === null) {
    if (viewType === "form") {
      return <Form />;
    } else {
      return <List isLoading searchBarPlaceholder={placeholder} />;
    }
  }

  if (hasToken && tokenIsValid) {
    return <>{children}</>;
  }

  return challengeId ? (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Code" onSubmit={handleSubmit} {...itemProps} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.code} id="code" title="Code" placeholder="Enter 4-digit code from popup" />
    </Form>
  ) : (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Authentication required"
      navigationTitle="Authenticate to Continue"
    >
      <List.EmptyView
        icon={Icon.Lock}
        title="Authentication required"
        description="Start pairing for a 4-digit code to pop up in the Anytype app."
        actions={
          <ActionPanel>
            <Action title="Start Pairing" onAction={startChallenge} />
          </ActionPanel>
        }
      />
    </List>
  );
}
