import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useContacts, useEvents, useRecentContacts, withGoogleAPIs } from "./lib/google";
import { useState, useMemo } from "react";
import { getAvatarIcon } from "@raycast/utils";
import { people_v1 } from "@googleapis/people";
import { calendar_v3 } from "@googleapis/calendar";
import { formatRecurrence } from "./lib/utils";

function getContactIcon(contact: people_v1.Schema$Person) {
  const profileUrl = contact.photos?.find((photo) => photo.metadata?.source?.type === "PROFILE")?.url;
  if (profileUrl) {
    const icon: Image = {
      source: profileUrl,
      fallback: Icon.Person,
      mask: Image.Mask.Circle,
    };
    return icon;
  }

  const name = contact.names?.[0]?.displayName ?? contact.emailAddresses?.[0]?.value;
  if (name) {
    return getAvatarIcon(name);
  }

  return Icon.Person;
}

function getEventAccessories(event: calendar_v3.Schema$Event) {
  const accessories = new Array<List.Item.Accessory>();

  if (event.recurrence || event.recurringEventId) {
    const accessory: List.Item.Accessory = {
      icon: Icon.Repeat,
      tooltip: event.recurrence ? formatRecurrence(event.recurrence) : undefined,
    };
    accessories.push(accessory);
  }

  if (event.conferenceData) {
    accessories.push({
      icon: event.conferenceData.conferenceSolution?.iconUri ?? Icon.Video,
      tooltip: `Conference: ${event.conferenceData.conferenceSolution?.name}`,
    });
  }

  if (event.attendees) {
    const accessory: List.Item.Accessory = {
      text: `${event.attendees.length}`,
      icon: Icon.Person,
      tooltip: event.attendees.map((attendee) => `${attendee.email} (${attendee.responseStatus})`).join("\n"),
    };
    accessories.push(accessory);
  }

  return accessories;
}

function formatEventTime(event: calendar_v3.Schema$Event, section: string) {
  const startDate = new Date(event.start?.dateTime ?? event.start?.date ?? "");
  const endDate = new Date(event.end?.dateTime ?? event.end?.date ?? "");

  if (section === "Today" || section === "Tomorrow") {
    if (event.start?.date) {
      return "All day";
    } else {
      return `${startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }
  }

  return startDate.toLocaleDateString(undefined, { weekday: "long", day: "numeric" });
}

function TeammateCalendarView({ email, name, onBack }: { email: string; name?: string; onBack: () => void }) {
  const { data, isLoading, error } = useEvents(email);

  if (error) {
    const errorMessage = error.message?.includes("404")
      ? "Calendar not found or not shared with you"
      : error.message?.includes("403")
        ? "You don't have permission to view this calendar"
        : "Could not load calendar";

    return (
      <List navigationTitle={`${name ?? email}'s Calendar`}>
        <List.EmptyView
          icon={Icon.Calendar}
          title={errorMessage}
          description="Ask your teammate to share their calendar with you in Google Calendar settings."
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const sections =
    data?.reduce(
      (acc, event) => {
        const date = new Date(event.start?.dateTime ?? event.start?.date ?? "");
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeekStart = new Date(now);
        nextWeekStart.setDate(now.getDate() + 2);
        const nextWeekEnd = new Date(now);
        nextWeekEnd.setDate(now.getDate() + 7);

        let section;

        if (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        ) {
          section = "Today";
        } else if (
          date.getFullYear() === tomorrow.getFullYear() &&
          date.getMonth() === tomorrow.getMonth() &&
          date.getDate() === tomorrow.getDate()
        ) {
          section = "Tomorrow";
        } else if (date >= nextWeekStart && date <= nextWeekEnd) {
          section = "Next Week";
        } else if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) {
          section = `Rest of ${date.toLocaleString("default", { month: "long" })}`;
        } else {
          section = date.toLocaleString("default", { month: "long" });
        }

        if (!acc[section]) {
          acc[section] = [];
        }
        acc[section].push(event);
        return acc;
      },
      {} as Record<string, calendar_v3.Schema$Event[]>,
    ) ?? {};

  const sectionOrder = Object.keys(sections).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Tomorrow") return -1;
    if (b === "Tomorrow") return 1;
    const dateA = new Date(a);
    const dateB = new Date(b);
    return dateA.getTime() - dateB.getTime();
  });

  return (
    <List isLoading={isLoading} navigationTitle={`${name ?? email}'s Calendar`}>
      {sectionOrder.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No upcoming events"
          description={`${name ?? email} has no visible upcoming events.`}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      ) : (
        sectionOrder.map((section) => {
          const events = sections[section];
          if (!events?.length) return null;

          return (
            <List.Section key={section} title={section}>
              {events.map((event) => (
                <List.Item
                  key={event.id}
                  icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                  title={event.summary ?? "Busy"}
                  subtitle={formatEventTime(event, section)}
                  accessories={getEventAccessories(event)}
                  actions={
                    <ActionPanel>
                      <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
                      {event.htmlLink && <Action.OpenInBrowser title="Open in Google Calendar" url={event.htmlLink} />}
                      {event.hangoutLink && <Action.OpenInBrowser title="Join Meeting" url={event.hangoutLink} />}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })
      )}
    </List>
  );
}

function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [selectedContact, setSelectedContact] = useState<{ email: string; name?: string } | null>(null);

  // Use recent contacts when no search, search contacts when typing
  const { data: recentContacts, isLoading: recentLoading } = useRecentContacts();
  const { data: searchResults, isLoading: searchLoading } = useContacts(searchText || undefined);

  const contacts = useMemo(() => {
    if (searchText) {
      return searchResults ?? [];
    }
    return recentContacts ?? [];
  }, [searchText, searchResults, recentContacts]);

  const isLoading = searchText ? searchLoading : recentLoading;

  if (selectedContact) {
    return (
      <TeammateCalendarView
        email={selectedContact.email}
        name={selectedContact.name}
        onBack={() => setSelectedContact(null)}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      searchBarPlaceholder="Search teammates by name or email..."
      onSearchTextChange={setSearchText}
    >
      {contacts.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Person}
          title={searchText ? "No contacts found" : "No recent contacts"}
          description={searchText ? "Try a different search term" : "Start typing to search for teammates"}
        />
      ) : (
        <List.Section title={searchText ? "Search Results" : "Recent Contacts"}>
          {contacts.map((contact) => {
            const email = contact.emailAddresses?.[0]?.value;
            const name = contact.names?.[0]?.displayName;
            if (!email) return null;

            return (
              <List.Item
                key={contact.resourceName ?? email}
                icon={getContactIcon(contact)}
                title={name ?? email}
                subtitle={name ? email : undefined}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Calendar"
                      icon={Icon.Calendar}
                      onAction={() => {
                        setSelectedContact({ email, name });
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Email" content={email} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

export default withGoogleAPIs(Command);
