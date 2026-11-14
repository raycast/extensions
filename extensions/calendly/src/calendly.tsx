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
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, withAccessToken } from "@raycast/utils";
import { createSingleUseLink, listEventTypes } from "./api/event-types";
import { getCurrentUser } from "./api/users";
import { EventType } from "./api/types";
import { calendlyOAuth } from "./oauth/calendly";

function Calendly() {
  const { data: user, isLoading: isLoadingUser, revalidate: revalidateUser } = useCachedPromise(getCurrentUser, []);
  const { defaultAction } = getPreferenceValues<Preferences.Calendly>();
  const { data: items = [], isLoading, revalidate } = useCachedPromise(listEventTypes, []);

  function RefreshAction() {
    return (
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={async () => {
          try {
            const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing..." });
            await Promise.all([revalidate(), revalidateUser()]);
            await toast.hide();
          } catch (error) {
            await showFailureToast(error, { title: "Could Not Refresh Calendly" });
          }
        }}
      />
    );
  }

  return (
    <List isLoading={isLoading || isLoadingUser}>
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
          icon={user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.Person}
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
            accessories={[{ text: `${event.duration} min` }]}
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

function CopyMeetingLinkAction({ event }: { event: EventType }) {
  return <Action.CopyToClipboard title="Copy Meeting URL" icon={Icon.Calendar} content={event.scheduling_url} />;
}

function CopyOneTimeLinkAction({ event }: { event: EventType }) {
  return (
    <Action
      title="Copy Single Use Link"
      icon={Icon.Calendar}
      onAction={async () => {
        try {
          const toast = await showToast({ style: Toast.Style.Animated, title: "Generating Link..." });
          const data = await createSingleUseLink(event.uri);
          await Clipboard.copy(data.booking_url);
          await toast.hide();
          await showHUD("Single-use Link Copied to Clipboard 📋");
        } catch (error) {
          await showFailureToast(error, { title: "Could Not Create Single-Use Link" });
        }
      }}
    />
  );
}

export default withAccessToken(calendlyOAuth)(Calendly);
