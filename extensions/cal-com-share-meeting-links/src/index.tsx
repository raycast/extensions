import { Action, ActionPanel, Color, Icon, List, openCommandPreferences } from "@raycast/api";
import { formatCurrency, useCurrentUser, useEventTypes } from "@api/cal.com";

export default function Command() {
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
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
