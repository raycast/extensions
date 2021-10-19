import {
  List,
  CopyToClipboardAction,
  ActionPanel,
  Icon,
  ToastStyle,
  Toast,
  copyTextToClipboard,
  showHUD,
  OpenInBrowserAction,
  Detail,
  showToast,
  getLocalStorageItem,
  getPreferenceValues,
  ImageMask,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Preferences, CalendlyEventType, CalendlyUser, createSingleUseLink, getEventTypes } from "./services/calendly";

const tokenURL = "https://calendly.com/integrations/api_webhooks";

const error = `
  # ⚠️ Calendly Access Token Error ⚠️

  Your Calendly Personal Access Token is not valid. Go into Raycast preferences to change it.

  ---

  To get your personal access token go to [${tokenURL}](${tokenURL}) and click "Generate New Token". Give your token a name like "*raycast*" and then Create Token. The token will only be shown to you once. Copy that token into your Raycast preferences.
`;

export default function Calendly() {
  const [items, setItems] = useState<CalendlyEventType[] | undefined>(undefined);
  const [showError, setShowError] = useState(false);
  const [user, setUser] = useState<CalendlyUser | undefined>(undefined);
  const { defaultAction }: Preferences = getPreferenceValues();

  useEffect(() => {
    getLocalStorageItem("user").then((data) => {
      if (data) {
        setUser(JSON.parse(data.toString()));
      }
    });
    getEventTypes()
      .then((data) => {
        setItems(data);
      })
      .catch((error) => {
        if (error.response.status === 401) {
          setShowError(true);
        } else {
          showToast(ToastStyle.Failure, "Sorry, something went wrong");
        }
      });
  }, []);

  if (showError)
    return (
      <Detail
        markdown={error}
        actions={
          <ActionPanel>
            <OpenInBrowserAction url={tokenURL} title="Open Calendly Integrations Page" />
          </ActionPanel>
        }
      />
    );

  return (
    <List isLoading={items === undefined}>
      <List.Item
        title="Open Calendly Dashboard"
        icon={{
          source: "logo.png",
        }}
        actions={
          <ActionPanel>
            <OpenInBrowserAction url="https://calendly.com/dashboard" />
          </ActionPanel>
        }
      />
      {user && (
        <List.Item
          title="Copy My Link"
          subtitle={"/" + user.slug}
          icon={{ source: user.avatar_url, mask: ImageMask.Circle }}
          actions={
            <ActionPanel>
              <CopyToClipboardAction title="Copy My Link" icon={Icon.Calendar} content={user.scheduling_url} />
              <OpenInBrowserAction url={user.scheduling_url} />
            </ActionPanel>
          }
        />
      )}
      {items?.map((event) => {
        return (
          <List.Item
            title={event.name}
            key={event.uri}
            icon={{ source: Icon.Circle, tintColor: event.color }}
            subtitle={event.slug ? `/${event.slug}` : ""}
            actions={
              <ActionPanel title="Calendly">
                {defaultAction === "meeting" ? (
                  <>
                    <CopyMeetingLinkAction event={event} />
                    <CopyOneTimeLinkAction event={event} />
                  </>
                ) : (
                  <>
                    <CopyOneTimeLinkAction event={event} />
                    <CopyMeetingLinkAction event={event} />
                  </>
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function CopyMeetingLinkAction({ event }: { event: CalendlyEventType }) {
  return <CopyToClipboardAction title="Copy Meeting URL" icon={Icon.Calendar} content={event.scheduling_url} />;
}
function CopyOneTimeLinkAction({ event }: { event: CalendlyEventType }) {
  return (
    <ActionPanel.Item
      title="Copy Single Use Link"
      icon={Icon.Calendar}
      onAction={async () => {
        const toast = new Toast({ style: ToastStyle.Animated, title: "Generating Link..." });
        await toast.show();
        const data = await createSingleUseLink(event);
        await copyTextToClipboard(data.booking_url);
        await toast.hide();
        await showHUD("Single-use Link Copied to Clipboard 📋");
      }}
    />
  );
}
