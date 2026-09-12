import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { hideRsvpPrompt, listNeedsRsvp, rsvpToEvent, type NeedsRsvpItem } from "./api";
import {
  ErrorState,
  formatDateTime,
  getMeetingAccessories,
  meetingIcon,
  noteSnippetMarkdown,
  openNocalDeepLink,
} from "./components";

export default function NeedsRsvpCommand() {
  const [items, setItems] = useState<NeedsRsvpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await listNeedsRsvp();
      setItems(response.results);
    } catch (newError) {
      setError(newError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const handleRsvp = async (item: NeedsRsvpItem, status: "ACCEPTED" | "DECLINED" | "TENTATIVE", forSeries = false) => {
    const labels = {
      ACCEPTED: "Accepted",
      DECLINED: "Declined",
      TENTATIVE: "Maybe",
    };
    const targetId = forSeries && item.event.series ? item.event.series : item.event.id;
    const removed: NeedsRsvpItem[] =
      forSeries && item.event.series
        ? items.filter((i) => i.event.series === item.event.series)
        : items.filter((i) => i.event.id === item.event.id);
    setItems((prev) =>
      forSeries && item.event.series
        ? prev.filter((i) => i.event.series !== item.event.series)
        : prev.filter((i) => i.event.id !== item.event.id),
    );
    try {
      await rsvpToEvent(targetId, status);
      await showToast({
        style: Toast.Style.Success,
        title: labels[status],
        message: item.event.title ?? "Untitled Event",
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "RSVP failed",
        message: "Could not update your response.",
      });
      setItems((prev) => [...prev, ...removed]);
    }
  };

  const handleHide = async (item: NeedsRsvpItem, forSeries = false) => {
    const targetId = forSeries && item.event.series ? item.event.series : item.event.id;
    const removed: NeedsRsvpItem[] =
      forSeries && item.event.series
        ? items.filter((i) => i.event.series === item.event.series)
        : items.filter((i) => i.event.id === item.event.id);
    setItems((prev) =>
      forSeries && item.event.series
        ? prev.filter((i) => i.event.series !== item.event.series)
        : prev.filter((i) => i.event.id !== item.event.id),
    );
    try {
      await hideRsvpPrompt(targetId);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not hide",
        message: "Failed to hide this invite.",
      });
      setItems((prev) => [...prev, ...removed]);
    }
  };

  return (
    <List isLoading={isLoading}>
      {error ? <ErrorState title="Couldn't Load Events" error={error} onRetry={() => void loadItems()} /> : null}
      {!error && !isLoading && items.length === 0 ? (
        <List.EmptyView
          title="All Caught Up"
          description="No events need an RSVP response."
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
        />
      ) : null}
      {items.map((item) => {
        const { event } = item;
        const isRecurring = Boolean(event.series);
        const displayTime = item.next_occurrence ?? event.start_time;
        const hasConflicts = item.conflicts.length > 0;

        const accessories = getMeetingAccessories(displayTime, event.is_all_day);

        if (hasConflicts) {
          accessories.push({
            tag: { value: "Conflict", color: Color.Red },
            tooltip: item.conflicts.map((c) => c.title ?? "Untitled").join(", "),
          });
        }

        const rsvpAction = (
          title: string,
          icon: NonNullable<List.Item.Accessory["icon"]>,
          status: "ACCEPTED" | "DECLINED" | "TENTATIVE",
        ) =>
          isRecurring ? (
            <ActionPanel.Submenu title={title} icon={icon}>
              <Action title="Just This Instance" onAction={() => void handleRsvp(item, status, false)} />
              <Action title="All Instances" onAction={() => void handleRsvp(item, status, true)} />
            </ActionPanel.Submenu>
          ) : (
            <Action title={title} icon={icon} onAction={() => void handleRsvp(item, status, false)} />
          );

        const hideAction = isRecurring ? (
          <ActionPanel.Submenu title="Hide This Invite" icon={Icon.EyeDisabled}>
            <Action title="Just This Instance" onAction={() => void handleHide(item, false)} />
            <Action title="All Instances" onAction={() => void handleHide(item, true)} />
          </ActionPanel.Submenu>
        ) : (
          <Action title="Hide This Invite" icon={Icon.EyeDisabled} onAction={() => void handleHide(item, false)} />
        );

        return (
          <List.Item
            key={event.id}
            icon={meetingIcon("NEEDS_ACTION", event.status)}
            title={event.title ?? "Untitled Event"}
            subtitle={event.location ?? undefined}
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={`# ${event.title ?? "Untitled Event"}\n\n${noteSnippetMarkdown(event.description)}${
                  event.recurrence_summary ? `\n\n**Recurs:** ${event.recurrence_summary}` : ""
                }${
                  hasConflicts
                    ? `\n\n**Conflicts with:** ${item.conflicts.map((c) => c.title ?? "Untitled").join(", ")}`
                    : ""
                }`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="When"
                      text={formatDateTime(displayTime, event.is_all_day)}
                    />
                    {event.location ? <List.Item.Detail.Metadata.Label title="Location" text={event.location} /> : null}
                    {event.conferencing_details?.platform ? (
                      <List.Item.Detail.Metadata.Label title="Conference" text={event.conferencing_details.platform} />
                    ) : null}
                    {event.recurrence_summary ? (
                      <List.Item.Detail.Metadata.Label title="Recurrence" text={event.recurrence_summary} />
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Submenu title="Respond…" icon={Icon.Envelope}>
                  {rsvpAction("Accept", { source: Icon.CheckCircle, tintColor: Color.Green }, "ACCEPTED")}
                  {rsvpAction("Decline", { source: Icon.XMarkCircle, tintColor: Color.Red }, "DECLINED")}
                  {rsvpAction("Maybe", { source: Icon.MinusCircle, tintColor: Color.Orange }, "TENTATIVE")}
                  {hideAction}
                  <Action
                    title="Open in Nocal"
                    icon={Icon.Calendar}
                    onAction={() =>
                      openNocalDeepLink(
                        `event?id=${encodeURIComponent(event.id)}&calendar=${encodeURIComponent(event.calendar)}`,
                      )
                    }
                  />
                </ActionPanel.Submenu>
                <ActionPanel.Section>
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadItems()} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
