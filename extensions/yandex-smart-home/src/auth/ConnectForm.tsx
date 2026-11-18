/**
 * Connect flow: List with visible actions, then Form to paste code.
 */

import {
  List,
  Form,
  showToast,
  Toast,
  Icon,
  open,
  getPreferenceValues,
  ActionPanel,
  Action,
  popToRoot,
} from "@raycast/api";
import { useCallback, useState } from "react";
import {
  client,
  generatePKCE,
  getYandexVerificationCodeAuthUrl,
  exchangeYandexCode,
} from "../api/oauth";

type ConnectFormProps = {
  clientId: string;
  codeVerifier: string | null;
  onConnected: (token: string) => void;
};

/** Form to paste the 7-digit code (pushed after "Enter code"). */
export function ConnectForm({
  clientId,
  codeVerifier,
  onConnected,
}: ConnectFormProps) {
  const handleSubmit = useCallback(
    async (values: { code: string }) => {
      if (!codeVerifier) {
        showToast({
          style: Toast.Style.Failure,
          title: "Open Yandex First",
          message: 'Go back and run "Open Yandex" to get the code.',
        });
        return;
      }
      try {
        const prefs = getPreferenceValues<{ redirectUri?: string }>();
        const data = await exchangeYandexCode(
          values.code,
          codeVerifier,
          clientId,
          prefs.redirectUri,
        );
        await client.setTokens({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
        });
        showToast({ style: Toast.Style.Success, title: "Connected" });
        onConnected(data.access_token);
        popToRoot();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Connection Failed",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [clientId, codeVerifier, onConnected],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Paste code from Yandex"
        text="Paste the 7-digit code from the Yandex page and press Connect."
      />
      <Form.TextField id="code" title="Code" placeholder="e.g. 1234567" />
    </Form>
  );
}

type ConnectViewProps = {
  clientId: string;
  onConnected: (token: string) => void;
};

/** List view: two visible items to click — Open Yandex, then Enter code. */
export function ConnectView({ clientId, onConnected }: ConnectViewProps) {
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);

  const handleOpenYandex = useCallback(() => {
    const prefs = getPreferenceValues<{ redirectUri?: string }>();
    const { codeVerifier: verifier, codeChallenge } = generatePKCE();
    const state = Math.random().toString(36).slice(2);
    setCodeVerifier(verifier);
    const url = getYandexVerificationCodeAuthUrl(
      clientId,
      codeChallenge,
      state,
      prefs.redirectUri,
    );
    open(url);
    showToast({
      style: Toast.Style.Success,
      title: "Browser Opened",
      message: "Log in, allow access, then copy the 7-digit code.",
    });
  }, [clientId]);

  return (
    <List>
      <List.Item
        icon={Icon.Link}
        title="Open Yandex"
        subtitle="Log in and get the 7-digit code in the browser"
        actions={
          <ActionPanel>
            <Action
              title="Open Yandex"
              icon={Icon.Link}
              onAction={handleOpenYandex}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Key}
        title="Enter Code"
        subtitle="Paste the 7-digit code from the Yandex page"
        actions={
          <ActionPanel>
            <Action.Push
              title="Enter Code"
              icon={Icon.Key}
              target={
                <ConnectForm
                  clientId={clientId}
                  codeVerifier={codeVerifier}
                  onConnected={onConnected}
                />
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
