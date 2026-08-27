import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCachedPromise, withAccessToken } from "@raycast/utils";

import { createSingleUseLink, listEventTypes } from "./api/event-types";
import { EventType } from "./api/types";
import { getCurrentUser } from "./api/users";
import { calendlyOAuth } from "./oauth/calendly";

async function loadShareLinks() {
  const [user, eventTypes] = await Promise.all([getCurrentUser(), listEventTypes()]);
  return { user, eventTypes };
}

function ShareMeetingLink() {
  const { defaultAction } = getPreferenceValues<{ defaultAction: "meeting" | "one-time" }>();
  const { data, isLoading, revalidate } = useCachedPromise(loadShareLinks, []);
  const user = data?.user;
  const eventTypes = data?.eventTypes ?? [];

  function RefreshAction() {
    return (
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search event types…">
      <List.Item
        title="Open Calendly Dashboard"
        icon={Icon.AppWindow}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://calendly.com/dashboard" />
            <RefreshAction />
          </ActionPanel>
        }
      />
      {user ? (
        <List.Item
          title="Copy My Link"
          subtitle={`/${user.slug}`}
          icon={user.avatar_url ? { source: user.avatar_url, mask: Image.Mask.Circle } : Icon.Person}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy My Link" icon={Icon.Calendar} content={user.scheduling_url} />
              <Action.OpenInBrowser url={user.scheduling_url} />
              <RefreshAction />
            </ActionPanel>
          }
        />
      ) : null}
      {eventTypes.map((eventType) => (
        <List.Item
          key={eventType.uri}
          title={eventType.name}
          icon={{ source: Icon.Circle, tintColor: eventType.color }}
          subtitle={eventType.slug ? `/${eventType.slug}` : ""}
          accessories={[{ text: `${eventType.duration} min` }]}
          actions={
            <ActionPanel title="Calendly">
              {defaultAction === "meeting" ? (
                <>
                  <CopyMeetingLinkAction eventType={eventType} />
                  <CopyOneTimeLinkAction eventType={eventType} />
                </>
              ) : (
                <>
                  <CopyOneTimeLinkAction eventType={eventType} />
                  <CopyMeetingLinkAction eventType={eventType} />
                </>
              )}
              <RefreshAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CopyMeetingLinkAction({ eventType }: { eventType: EventType }) {
  return <Action.CopyToClipboard title="Copy Meeting URL" icon={Icon.Calendar} content={eventType.scheduling_url} />;
}

function CopyOneTimeLinkAction({ eventType }: { eventType: EventType }) {
  return (
    <Action
      title="Copy Single Use Link"
      icon={Icon.Link}
      onAction={async () => {
        const toast = await showToast(Toast.Style.Animated, "Generating Link…");
        try {
          const link = await createSingleUseLink(eventType.uri);
          await Clipboard.copy(link.booking_url);
          toast.style = Toast.Style.Success;
          toast.title = "Copied single-use link";
          await showHUD("Single-use Link Copied to Clipboard");
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Could not create link";
          toast.message = error instanceof Error ? error.message : String(error);
        }
      }}
    />
  );
}

export default withAccessToken(calendlyOAuth)(ShareMeetingLink);
