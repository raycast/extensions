import {
  List,
  ActionPanel,
  Icon,
  Toast,
  showHUD,
  Detail,
  showToast,
  getPreferenceValues,
  Action,
  Clipboard,
  OAuth,
  Image,
} from "@raycast/api";
import {
  Preferences,
  CalendlyEventType,
  createSingleUseLink,
  useEventTypes,
  useCurrentUser,
} from "./services/calendly";

const tokenURL = "https://calendly.com/integrations/api_webhooks";

const errorMd = `
  # ⚠️ Calendly Access Token Error ⚠️

  Your Calendly Personal Access Token is not valid. Go into Raycast preferences to change it.

  ---

  To get your personal access token go to [${tokenURL}](${tokenURL}) and click "Generate New Token". Give your token a name like "*raycast*" and then Create Token. The token will only be shown to you once. Copy that token into your Raycast preferences.
`;

export default function Calendly() {
  // const [showError, setShowError] = useState(false);
  const { user, error } = useCurrentUser();
  const { defaultAction }: Preferences = getPreferenceValues();
  const { eventTypes: items, isLoading, revalidate } = useEventTypes();

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

  if (error)
    return (
      <Detail
        markdown={errorMd}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={tokenURL} title="Open Calendly Integrations Page" />
          </ActionPanel>
        }
      />
    );

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
