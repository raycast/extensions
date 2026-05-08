import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchType,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import { beginOAuthLogin, completeOAuthLogin, verifyAuth } from "./flickr";
import { clearPendingOAuth, clearStoredAuth, getPendingOAuth, getStoredAuth, setPendingOAuth, setStoredAuth } from "./storage";
import { PendingOAuth } from "./types";

export default function Command() {
  const [verifier, setVerifier] = useState("");
  const [pendingOAuth, setPendingOAuthState] = useState<PendingOAuth | undefined>();
  const [statusText, setStatusText] = useState("Checking Flickr connection status…");
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    void loadState();
  }, []);

  async function loadState() {
    setIsLoading(true);
    try {
      const [storedAuth, pending] = await Promise.all([getStoredAuth(), getPendingOAuth()]);
      setPendingOAuthState(pending);

      if (!storedAuth) {
        setStatusText("No Flickr account connected yet.");
        setIsConnected(false);
        return;
      }

      const authCheck = await verifyAuth(storedAuth);
      setStatusText(`Connected as ${authCheck.user.username._content} (${storedAuth.userNsid})`);
      setIsConnected(true);
    } catch (error) {
      setStatusText("Stored Flickr session could not be verified.");
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartOAuth() {
    try {
      setIsLoading(true);
      const { requestToken, requestTokenSecret, authorizeUrl } = await beginOAuthLogin();
      const nextPending = { requestToken, requestTokenSecret, createdAt: Date.now() };
      await setPendingOAuth(nextPending);
      setPendingOAuthState(nextPending);
      await open(authorizeUrl);
      await showToast({
        style: Toast.Style.Success,
        title: "Authorization opened",
        message: "Authorize the app in Flickr and paste the verifier code here.",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not start Flickr authorization" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFinishOAuth() {
    if (!pendingOAuth) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Start authorization first",
        message: "Open the Flickr authorization page before entering the verifier.",
      });
      return;
    }

    if (!verifier.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Verifier required",
      });
      return;
    }

    try {
      setIsLoading(true);
      const auth = await completeOAuthLogin(
        pendingOAuth.requestToken,
        pendingOAuth.requestTokenSecret,
        verifier.trim(),
      );
      await setStoredAuth(auth);
      await clearPendingOAuth();
      setPendingOAuthState(undefined);
      setVerifier("");
      setStatusText(`Connected as ${auth.username} (${auth.userNsid})`);
      setIsConnected(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Flickr connected",
        message: `Logged in as ${auth.username}`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not finish Flickr login" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect() {
    await Promise.all([clearStoredAuth(), clearPendingOAuth()]);
    setPendingOAuthState(undefined);
    setVerifier("");
    setStatusText("Flickr account disconnected.");
    setIsConnected(false);
    await showToast({
      style: Toast.Style.Success,
      title: "Disconnected from Flickr",
    });
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Setup Flickr"
      actions={
        <ActionPanel>
          {isConnected ? (
            <>
              <Action
                title="Open Upload Photo"
                icon={Icon.Upload}
                onAction={() => launchCommand({ name: "upload-photo", type: LaunchType.UserInitiated })}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="Disconnect Flickr"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={handleDisconnect}
              />
            </>
          ) : verifier.trim() ? (
            <>
              <Action.SubmitForm
                title="2. Complete Flickr Login"
                icon={Icon.Checkmark}
                onSubmit={handleFinishOAuth}
              />
              <Action
                title="1. Open Flickr Authorization"
                icon={Icon.Globe}
                onAction={handleStartOAuth}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </>
          ) : (
            <>
              <Action
                title="1. Open Flickr Authorization"
                icon={Icon.Globe}
                onAction={handleStartOAuth}
              />
              <Action.SubmitForm
                title="2. Complete Flickr Login"
                icon={Icon.Checkmark}
                onSubmit={handleFinishOAuth}
              />
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </>
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Status"
        text={statusText}
      />
      <Form.Description
        title="Flickr App Setup"
        text="First enter your Flickr API Key and Flickr API Secret in the extension settings. Then create the Flickr app as a Desktop Application, start authorization here, approve the app in the browser, and paste the verifier code below."
      />
      <Form.TextField
        id="verifier"
        title="OAuth Verifier"
        placeholder="Paste the verifier from Flickr"
        value={verifier}
        onChange={setVerifier}
      />
      <Form.Description
        title="Pending Authorization"
        text={
          pendingOAuth
            ? `Request token prepared at ${new Date(pendingOAuth.createdAt).toLocaleString()}`
            : "No pending authorization yet."
        }
      />
    </Form>
  );
}
