import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { getAccessToken } from "@raycast/utils";
import { Room, getStoredRooms, saveRooms, clearRooms } from "./roomStore";
import { ManualAddForm } from "./onboarding";
import { ExportAction, ImportRoomsForm } from "./importExport";

const VALIDITY_KEY = "room-block-validity-v1";

type Validity = { valid: boolean; checkedAt: string; error?: string };
type ValidityMap = Record<string, Validity>;

async function getValidityMap(): Promise<ValidityMap> {
  const raw = await LocalStorage.getItem<string>(VALIDITY_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ValidityMap;
  } catch {
    return {};
  }
}

async function saveValidityMap(map: ValidityMap): Promise<void> {
  await LocalStorage.setItem(VALIDITY_KEY, JSON.stringify(map));
}

/**
 * A room "goes invalid" when its calendar no longer exists or we've lost
 * access — e.g. the room was renamed, decommissioned, or removed from
 * Workspace. calendars.get is the cheapest way to check: 200 means it's
 * still a real, reachable calendar; 404/403 means something changed.
 */
async function checkRoom(token: string, room: Room): Promise<Validity> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(room.calendarId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.ok) {
      return { valid: true, checkedAt: new Date().toISOString() };
    }
    return {
      valid: false,
      checkedAt: new Date().toISOString(),
      error: `${res.status} ${res.statusText}`,
    };
  } catch (error) {
    return {
      valid: false,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatCheckedAgo(iso?: string): string {
  if (!iso) return "never checked";
  const days = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "checked today";
  if (days === 1) return "checked 1 day ago";
  if (days < 30) return `checked ${days} days ago`;
  const months = Math.floor(days / 30);
  return `checked ${months} month${months === 1 ? "" : "s"} ago`;
}

export default function ManageRooms({ onChanged }: { onChanged: () => void }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [validity, setValidity] = useState<ValidityMap>({});
  const [isChecking, setIsChecking] = useState(false);
  const { push, pop } = useNavigation();

  async function load() {
    setRooms((await getStoredRooms()) ?? []);
    setValidity(await getValidityMap());
  }

  useEffect(() => {
    load();
  }, []);

  async function recheckAll() {
    setIsChecking(true);
    try {
      const { token } = getAccessToken();
      const map = await getValidityMap();

      // Sequential, not Promise.all — keeps this well under Calendar API's
      // per-second rate limit even with a large room list.
      for (const room of rooms) {
        map[room.calendarId] = await checkRoom(token, room);
      }

      await saveValidityMap(map);
      setValidity(map);
      const invalidCount = Object.values(map).filter((v) => !v.valid).length;
      await showToast({
        style: invalidCount > 0 ? Toast.Style.Failure : Toast.Style.Success,
        title:
          invalidCount > 0
            ? `${invalidCount} room(s) look invalid`
            : "All rooms check out",
      });
    } finally {
      setIsChecking(false);
    }
  }

  async function removeRoom(calendarId: string) {
    const updated = rooms.filter((r) => r.calendarId !== calendarId);
    await saveRooms(updated);
    setRooms(updated);
    onChanged();
  }

  async function handleRemoveRoom(room: Room) {
    const confirmed = await confirmAlert({
      title: `Remove "${room.name}"?`,
      message:
        "This removes it from your room list. You can re-add it manually or via import later.",
      primaryAction: {
        title: "Remove",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await removeRoom(room.calendarId);
  }

  function refreshAfterChildAction() {
    load();
    onChanged();
  }

  async function handleResetRoomSetup() {
    const confirmed = await confirmAlert({
      title: "Reset Room Setup?",
      message:
        "This clears your entire configured room list. You'll need to run onboarding again (calendar scan, import, or manual entry) to get it back.",
      primaryAction: {
        title: "Reset",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    await clearRooms();
    onChanged();
    pop();
  }

  const sharedActions = (
    <>
      <Action
        title="Recheck All Rooms"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={recheckAll}
      />
      <Action
        title="Add Room Manually"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        onAction={() =>
          push(<ManualAddForm onSaved={refreshAfterChildAction} />)
        }
      />
      <ExportAction />
      <Action
        title="Import Room List"
        icon={Icon.Download}
        onAction={() =>
          push(<ImportRoomsForm onImported={refreshAfterChildAction} />)
        }
      />
    </>
  );

  const resetAction =
    rooms.length > 0 ? (
      <ActionPanel.Section>
        <Action
          title="Reset Room Setup"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleResetRoomSetup}
        />
      </ActionPanel.Section>
    ) : null;

  return (
    <List
      isLoading={isChecking}
      navigationTitle="Manage Rooms"
      searchBarPlaceholder="Filter rooms..."
    >
      {rooms.length === 0 ? (
        <List.EmptyView
          title="No rooms configured"
          description="Add one manually, or import a list a colleague exported for you."
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      ) : (
        rooms.map((room) => {
          const v = validity[room.calendarId];
          const icon = !v
            ? Icon.QuestionMark
            : v.valid
              ? Icon.CheckCircle
              : Icon.XMarkCircle;
          const color = !v
            ? Color.SecondaryText
            : v.valid
              ? Color.Green
              : Color.Red;
          return (
            <List.Item
              key={room.calendarId}
              icon={Icon.Livestream}
              title={room.name}
              subtitle={room.calendarId}
              accessories={[
                {
                  text: formatCheckedAgo(v?.checkedAt),
                  icon: { source: icon, tintColor: color },
                },
              ]}
              actions={
                <ActionPanel>
                  {sharedActions}
                  <ActionPanel.Section>
                    <Action
                      title="Remove This Room"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleRemoveRoom(room)}
                    />
                  </ActionPanel.Section>
                  {resetAction}
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
