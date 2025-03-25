import {
  Action,
  ActionPanel,
  Form,
  Clipboard,
  openExtensionPreferences,
  showToast,
  Toast,
  Icon,
  showHUD,
} from "@raycast/api";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { getCachedSessionToken, useSessionToken } from "../helpers/nintendo";
dayjs.extend(relativeTime);
export default function GetSessionTokenForm() {
  const { url, getCode, sessionToken } = useSessionToken();
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const cachedSessionToken = getCachedSessionToken();
  const copyToClipboard = async () => {
    const sessionTokenValue = sessionToken.data?.session_token || cachedSessionToken?.value;
    if (!sessionTokenValue) {
      await showToast(Toast.Style.Failure, "Session Token not found.");
      return;
    }
    await Clipboard.copy(sessionTokenValue);
    showHUD("✅ Copied to clipboard.");
    openExtensionPreferences();
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={url || ""} title="Link an Account" />
          <Action title="Copy To Preferences" icon={{ source: Icon.Paperclip }} onAction={copyToClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Step 1"
        text="Open the link in your browser (⌘ + ↩) and log in to your Nintendo account."
      />
      <Form.Description
        title="Step 2"
        text="Right-click on the red button named 'Select this account', copy the link address and paste it into the input box below."
      />
      <Form.TextField
        id="url"
        placeholder="npf5c38e31cd085304b://auth"
        info="The link starts with npf5c38e31cd085304b://auth."
        error={urlError}
        autoFocus
        onChange={(url) => {
          if (url.length === 0) {
            setUrlError(undefined);
            return;
          }
          try {
            getCode(url);
            setUrlError(undefined);
          } catch (error: any) {
            setUrlError(error.message);
          }
        }}
      />
      <Form.Description
        title="Step 3"
        text="Wait for the Session Token to be fetched automatically, then paste it into preferences ( ⌘ + ⇧ + ↩ )."
      />
      <Form.TextField
        id="session_token"
        placeholder={sessionToken.isLoading ? "Loading" : undefined}
        value={sessionToken.data?.session_token || cachedSessionToken?.value}
        info="The Session Token has a validity period of 2 years, theoretically you only need to fetch it once."
      />
      {cachedSessionToken?.value && (
        <Form.Description text={`Last fetch was ${dayjs(cachedSessionToken.timestamp).fromNow()}.`} />
      )}
    </Form>
  );
}
