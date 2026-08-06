import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import { getStoredRooms, saveRooms, Room } from "./roomStore";
import { ImportRoomsForm } from "./importExport";

type FoundRoom = { name: string; email: string; count: number };

/**
 * Tries the Admin SDK Directory API — works only if the signed-in account
 * has Workspace admin rights (most don't). When it does work it's a free
 * full auto-import with real floor/capacity data, so it's always worth
 * trying silently before falling back to the calendar scan.
 */
async function tryDirectoryApi(token: string): Promise<Room[] | null> {
  try {
    const items: {
      resourceName?: string;
      resourceEmail?: string;
      capacity?: number;
      floorName?: string;
    }[] = [];
    let pageToken: string | undefined;

    do {
      const url =
        "https://admin.googleapis.com/admin/directory/v1/customer/my_customer/resources/calendars?maxResults=200" +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = (await res.json()) as {
        items?: {
          resourceName?: string;
          resourceEmail?: string;
          capacity?: number;
          floorName?: string;
        }[];
        nextPageToken?: string;
      };

      items.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    if (items.length === 0) return null;

    return items
      .filter((item) => item.resourceEmail)
      .map((item, index) => ({
        id: `dir-${index}`,
        name: item.resourceName ?? item.resourceEmail!,
        calendarId: item.resourceEmail!,
        floor: item.floorName,
        capacity: item.capacity,
      }));
  } catch {
    return null;
  }
}

/**
 * Calendar-API-only fallback (no admin rights needed): scans a full year
 * back plus 90 days ahead of the user's own primary calendar, paginating
 * through every page (up to a safety cap), and collects every attendee
 * flagged as a room resource. This is deliberately wide — the goal is to
 * catch every room the person has ever booked, not just recent ones.
 */
async function scanCalendarForRooms(token: string): Promise<FoundRoom[]> {
  const now = Date.now();
  const timeMin = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString();

  const found = new Map<string, FoundRoom>();
  let pageToken: string | undefined;
  let pagesFetched = 0;
  const MAX_PAGES = 20; // 20 x up to 2500 events/page — generous, with a hard safety cap

  do {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=2500` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;

    const data = (await res.json()) as {
      items?: {
        attendees?: {
          email?: string;
          displayName?: string;
          resource?: boolean;
        }[];
      }[];
      nextPageToken?: string;
    };

    for (const event of data.items ?? []) {
      for (const attendee of event.attendees ?? []) {
        if (attendee.resource && attendee.email) {
          const existing = found.get(attendee.email);
          if (existing) {
            existing.count += 1;
          } else {
            found.set(attendee.email, {
              name: attendee.displayName ?? attendee.email,
              email: attendee.email,
              count: 1,
            });
          }
        }
      }
    }

    pageToken = data.nextPageToken;
    pagesFetched += 1;
  } while (pageToken && pagesFetched < MAX_PAGES);

  // Most-used rooms first — the ones someone actually cares about tracking.
  return Array.from(found.values()).sort((a, b) => b.count - a.count);
}

export function ManualAddForm({
  onSaved,
}: {
  onSaved: (rooms: Room[]) => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    name: string;
    email: string;
    floor: string;
    capacity: string;
    equipment: string;
  }) {
    if (!values.name || !values.email) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name and calendar email are required",
      });
      return;
    }

    const existing = (await getStoredRooms()) ?? [];
    const newRoom: Room = {
      id: `manual-${Date.now()}`,
      name: values.name,
      calendarId: values.email,
      floor: values.floor.trim() || undefined,
      capacity: values.capacity.trim() ? Number(values.capacity) : undefined,
      equipment: values.equipment
        ? values.equipment
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    };

    const updated = [...existing, newRoom];
    await saveRooms(updated);
    await showToast({
      style: Toast.Style.Success,
      title: `Added ${newRoom.name}`,
    });
    onSaved(updated);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Room" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Don't know the room's calendar email? Create a calendar event, add this room as a guest, save it, then click the room's guest chip in Google Calendar to reveal its email." />
      <Form.TextField
        id="name"
        title="Room name"
        placeholder="e.g. Conference Room A"
      />
      <Form.TextField
        id="email"
        title="Calendar email"
        placeholder="room@resource.calendar.google.com"
      />
      <Form.TextField
        id="floor"
        title="Floor (optional)"
        placeholder="e.g. Floor 2"
      />
      <Form.TextField
        id="capacity"
        title="Capacity (optional)"
        placeholder="e.g. 6"
      />
      <Form.TextField
        id="equipment"
        title="Equipment (optional, comma-separated)"
        placeholder="Projector, TV"
      />
    </Form>
  );
}

export default function Onboarding({
  onComplete,
}: {
  onComplete: (rooms: Room[]) => void;
}) {
  const [phase, setPhase] = useState<"choose" | "checking" | "checklist">(
    "choose",
  );
  const [found, setFound] = useState<FoundRoom[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { push } = useNavigation();

  async function startCalendarPull() {
    setPhase("checking");
    const { token } = getAccessToken();

    try {
      const auto = await tryDirectoryApi(token);
      if (auto && auto.length > 0) {
        await saveRooms(auto);
        await showToast({
          style: Toast.Style.Success,
          title: `Found ${auto.length} room(s) automatically`,
        });
        onComplete(auto);
        return;
      }

      const results = await scanCalendarForRooms(token);
      setFound(results);
      setSelected(new Set(results.map((room) => room.email))); // preselect everything found
      setPhase("checklist");
    } catch (error) {
      setPhase("choose");
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't check your calendar",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function confirmSelection() {
    const rooms: Room[] = found
      .filter((room) => selected.has(room.email))
      .map((room, index) => ({
        id: `scan-${index}`,
        name: room.name,
        calendarId: room.email,
      }));

    if (rooms.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one room, or add one manually",
      });
      return;
    }

    await saveRooms(rooms);
    await showToast({
      style: Toast.Style.Success,
      title: `Saved ${rooms.length} room(s)`,
    });
    onComplete(rooms);
  }

  function toggle(email: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  if (phase === "choose") {
    return (
      <List
        searchBarPlaceholder="How do you want to set up your rooms?"
        navigationTitle="Set Up Room Block"
      >
        <List.Item
          icon={Icon.MagnifyingGlass}
          title="Pull Rooms from My Calendar"
          subtitle="Tries an automatic admin import first, then scans your booking history"
          actions={
            <ActionPanel>
              <Action
                title="Start"
                icon={Icon.MagnifyingGlass}
                onAction={startCalendarPull}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Download}
          title="Import Room List"
          subtitle="Paste a room list you (or a colleague) exported previously"
          actions={
            <ActionPanel>
              <Action
                title="Import"
                icon={Icon.Download}
                onAction={() =>
                  push(<ImportRoomsForm onImported={onComplete} />)
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Plus}
          title="Add Rooms Manually"
          subtitle="Type in room names and calendar emails one at a time"
          actions={
            <ActionPanel>
              <Action
                title="Add Manually"
                icon={Icon.Plus}
                onAction={() => push(<ManualAddForm onSaved={onComplete} />)}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (phase === "checking") {
    return (
      <List
        isLoading
        searchBarPlaceholder="Checking your calendar history..."
      />
    );
  }

  return (
    <List
      searchBarPlaceholder="Search rooms found in your calendar..."
      navigationTitle="Select rooms to track"
    >
      {found.length === 0 ? (
        <List.EmptyView
          title="No rooms found in your calendar history"
          description="Book a room in Google Calendar at least once, then re-run this — or add one manually below."
          actions={
            <ActionPanel>
              <Action
                title="Add Room Manually"
                icon={Icon.Plus}
                onAction={() => push(<ManualAddForm onSaved={onComplete} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        found.map((room) => (
          <List.Item
            key={room.email}
            icon={selected.has(room.email) ? Icon.CheckCircle : Icon.Circle}
            title={room.name}
            subtitle={`used in ${room.count} event${room.count === 1 ? "" : "s"}`}
            actions={
              <ActionPanel>
                <Action
                  title={selected.has(room.email) ? "Uncheck" : "Check"}
                  icon={Icon.Checkmark}
                  onAction={() => toggle(room.email)}
                />
                <Action
                  title={`Save ${selected.size} Selected Room(s)`}
                  icon={Icon.SaveDocument}
                  onAction={confirmSelection}
                />
                <Action
                  title="Add Another Room Manually"
                  icon={Icon.Plus}
                  onAction={() => push(<ManualAddForm onSaved={onComplete} />)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
