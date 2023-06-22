import { useEffect } from "react";
import {
  List,
  ActionPanel,
  Icon,
  Toast,
  showHUD,
  showToast,
  getPreferenceValues,
  Action,
  Clipboard,
  Image,
} from "@raycast/api";
import {
  Preferences,
  CalendlyEventType,
  createSingleUseLink,
  useEventTypes,
  useCurrentUser,
  authorize,
} from "./services/calendly";

export default function Calendly() {
  // const [showError, setShowError] = useState(false);
  const { user, error } = useCurrentUser();
  const { defaultAction }: Preferences = getPreferenceValues();
  const { eventTypes: items, isLoading, revalidate } = useEventTypes();

  useEffect(() => {
    (async () => {
      await authorize();
    })();
  }, []);

  function RefreshAction() {
    return (
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={async () => {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing..." });
          revalidate();
          await toast.hide();
        }}
      />
    );
  }

  console.log({ error });

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Open Calendly Dashboard"
        icon={{
          source: "logo.png",
        }}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://calendly.com/dashboard" />
            <RefreshAction />
          </ActionPanel>
        }
      />
      {user && (
        <List.Item
          title="Copy My Link"
          subtitle={"/" + user.slug}
          icon={{ source: user.avatar_url, mask: Image.Mask.Circle }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy My Link" icon={Icon.Calendar} content={user.scheduling_url} />
              <Action.OpenInBrowser url={user.scheduling_url} />
              <RefreshAction />
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
                <RefreshAction />
              </ActionPanel>
            }
          />
        );
      })}
      {isLoading || (
        <List.Item
          title="Refresh Data"
          key="refresh"
          icon={Icon.ArrowClockwise}
          actions={
            <ActionPanel>
              <RefreshAction />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function CopyMeetingLinkAction({ event }: { event: CalendlyEventType }) {
  return <Action.CopyToClipboard title="Copy Meeting URL" icon={Icon.Calendar} content={event.scheduling_url} />;
}

function CopyOneTimeLinkAction({ event }: { event: CalendlyEventType }) {
  return (
    <Action
      title="Copy Single Use Link"
      icon={Icon.Calendar}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Generating Link..." });
        await toast.show();
        const data = await createSingleUseLink(event);
        await Clipboard.copy(data.booking_url);
        await toast.hide();
        await showHUD("Single-use Link Copied to Clipboard 📋");
      }}
    />
  );
}
