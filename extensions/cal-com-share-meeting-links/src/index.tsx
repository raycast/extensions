import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  openCommandPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import {
  CalEventType,
  createPrivateLinkForEventType,
  formatCurrency,
  useCurrentUser,
  useEventTypes,
} from "@api/cal.com";
import { CanceledError, isAxiosError } from "axios";
import { showFailureToast } from "@raycast/utils";
import { MutableRefObject, useRef } from "react";

export default function Command() {
  const generatePrivateLinkAborter = useRef<AbortController>(new AbortController());

  const { data: user, error: userError, isLoading: isLoadingUser } = useCurrentUser();
  const { data: items, isLoading: isLoadingEvents, error: eventsError } = useEventTypes();

  return (
    <List isLoading={isLoadingUser || isLoadingEvents} searchBarPlaceholder={"Search by duration"}>
      {(eventsError || userError) && (
        <List.EmptyView
          title={eventsError ? "Unable to load your events" : "Unable to load your username"}
          description={"Check your API key"}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      )}
      {items?.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          accessories={[
            ...(item.price
              ? [
                  {
                    icon: { source: Icon.CreditCard, tintColor: Color.Green },
                    text: formatCurrency(item.price, item.currency),
                  },
                ]
              : []),
            ...(item.hidden
              ? [{ icon: { source: Icon.EyeDisabled, tintColor: Color.Orange }, tooltip: "Hidden" }]
              : []),
            ...(item.recurringEvent
              ? [
                  {
                    icon: { source: Icon.Repeat, tintColor: Color.Purple },
                    text: String(item.recurringEvent.count),
                    tooltip: `Repeats up to ${item.recurringEvent.count} times`,
                  },
                ]
              : []),
            ...(item.requiresConfirmation
              ? [
                  {
                    icon: { source: Icon.QuestionMarkCircle, tintColor: Color.Yellow },
                    tooltip: "Requires confirmation",
                  },
                ]
              : []),
            { icon: { source: Icon.Clock, tintColor: Color.Blue }, text: `${item.length} min` },
          ]}
          keywords={item.length ? [item.length.toString()] : []}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.link} icon={Icon.Link} />
              <Action.OpenInBrowser url={item.link} title="Preview URL" />
              <ActionPanel.Section title="Quick Links">
                <Action.OpenInBrowser
                  title="Open Dashboard"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  url="https://app.cal.com"
                />
                <Action.OpenInBrowser
                  title="Open Availability Troubleshooter"
                  shortcut={{ modifiers: ["cmd"], key: "t" }}
                  url={`https://app.cal.com/availability/troubleshoot?eventType=${item.slug}`}
                />
                <Action.CopyToClipboard
                  title="Copy My Link"
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  content={`https://cal.com/${user?.username}`}
                />
                <GeneratePrivateLinkCommand item={item} aborter={generatePrivateLinkAborter} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function GeneratePrivateLinkCommand({
  item,
  aborter,
}: {
  item: CalEventType;
  aborter: MutableRefObject<AbortController>;
}) {
  async function handleGeneratePrivateLink(item: CalEventType) {
    aborter.current.abort();

    const currAborter = new AbortController();
    aborter.current = currAborter;

    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Generating private link",
        primaryAction: {
          title: "Cancel",
          onAction: () => currAborter.abort(),
        },
      });
      const response = await createPrivateLinkForEventType(item.id, currAborter.signal);
      // TODO: As per cal.com docs (https://cal.com/docs/api-reference/v2/event-types-private-links/create-a-private-link-for-an-event-type),
      // `bookingUrl` should have a full and working URL but it doesn't and whatever it returns 404s. Appending `/<slug>` fixes it. Change this
      // back to just copy `response.bookingUrl` once that's fixed.
      await Clipboard.copy(`${response.bookingUrl}/${item.slug}`);
      await toast.hide();
      await showHUD(`Private link for event "${item.title}" generated and copied to clipboard`);
    } catch (error: unknown) {
      if (error instanceof CanceledError) {
        showToast({
          style: Toast.Style.Success,
          title: "Cancelled",
        });
        return;
      }

      if (isAxiosError(error) && error.response) {
        await showFailureToast(error, {
          title: `Could not generate private link (HTTP ${error.response.status})`,
        });
        return;
      }

      await showFailureToast(error, {
        title: `Could not generate private link`,
      });
    }
  }

  return (
    <Action
      title="Generate and copy private link"
      icon={Icon.EyeDisabled}
      onAction={() => handleGeneratePrivateLink(item)}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
    />
  );
}
