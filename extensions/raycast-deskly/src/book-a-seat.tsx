import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchProps,
  LaunchType,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import {
  bookSeat,
  fetchAvailableSeats,
  fetchBookings,
  fetchFavoriteSeats,
  fetchInformation,
  fetchSpaces,
} from "./api/deskly";
import { Booking } from "./lib/types";
import { toISODate } from "./lib/format";
import { failToast } from "./lib/utils";
import DesklyEmptyView from "./components/DesklyEmptyView";

function nextBookableDay(date: Date, prefs: Preferences.BookASeat): Date {
  // getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const enabled = [
    prefs.bookAtSunday,
    prefs.bookAtMonday,
    prefs.bookAtTuesday,
    prefs.bookAtWednesday,
    prefs.bookAtThursday,
    prefs.bookAtFriday,
    prefs.bookAtSaturday,
  ];
  const next = new Date(date);
  for (let i = 0; i < 14; i++) {
    next.setDate(next.getDate() + 1);
    if (enabled[next.getDay()]) return next;
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

async function fetchBookingFormData() {
  const prefs = getPreferenceValues<Preferences.BookASeat>();
  const [information, spaces, favoriteSeats] = await Promise.all([
    fetchInformation(),
    fetchSpaces(),
    fetchFavoriteSeats(),
  ]);

  const maxDays = information.accountInformation?.maxBookingDays ?? 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + maxDays + 1);

  const months: { year: number; month: number }[] = [];
  const cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= endDate) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const allBookings: Booking[] = (
    await Promise.all(months.map(({ year, month }) => fetchBookings(year, month)))
  ).flat();

  const relevantBookings = allBookings
    .filter((b) => {
      const d = new Date(b.date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= endDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const lastBookedDate = new Date(relevantBookings.length > 0 ? relevantBookings[0].date : today);
  lastBookedDate.setHours(0, 0, 0, 0);

  const primaryRoomId = information.user?.primaryRoom?.id ?? undefined;
  let primaryLocationId: string | undefined;
  if (primaryRoomId) {
    for (const loc of spaces) {
      if (loc.floors.some((fl) => fl.rooms.some((r) => r.id === primaryRoomId))) {
        primaryLocationId = loc.id;
        break;
      }
    }
  }

  // fetchSpaces and fetchInformation use different location IDs, so we join timeframes to each spaces
  // location. Room IDs ARE stable across both endpoints (the primaryRoom matching above relies on this),
  // so we join by shared room ID first — label-independent and reliable. Name matching is only a
  // fallback for locations whose rooms aren't listed in availableLocations; it is fragile (translated
  // labels, punctuation, a renamed location while information is still cached). Finally, when exactly
  // one location exists its timeframes are unambiguous, so an otherwise-unmatched location can use them.
  // Normalize from/until to HH:MM; the API may return HH:MM:SS and fetchAvailableSeats appends ":00".
  const toHHMM = (t: string) => t.slice(0, 5);
  const normalizeName = (name: string) => name.trim().toLowerCase();
  const normalizeTimeframes = (tfs: (typeof information.availableLocations)[number]["timeframes"]) =>
    tfs.map((tf) => ({ ...tf, from: toHHMM(tf.from), until: toHHMM(tf.until) }));

  const timeframesByRoomId = new Map<string, ReturnType<typeof normalizeTimeframes>>();
  const timeframesByName = new Map<string, ReturnType<typeof normalizeTimeframes>>();
  for (const loc of information.availableLocations) {
    const tfs = normalizeTimeframes(loc.timeframes);
    timeframesByName.set(normalizeName(loc.name), tfs);
    for (const fl of loc.floors ?? []) for (const r of fl.rooms ?? []) timeframesByRoomId.set(r.id, tfs);
  }
  const soleTimeframes =
    information.availableLocations.length === 1
      ? normalizeTimeframes(information.availableLocations[0].timeframes)
      : [];

  const spacesWithTimeframes = spaces.map((loc) => {
    const byRoom = loc.floors
      .flatMap((fl) => fl.rooms.map((r) => timeframesByRoomId.get(r.id)))
      .find((tfs) => tfs && tfs.length > 0);
    const byName = timeframesByName.get(normalizeName(loc.name));
    const timeframes = byRoom ?? (byName && byName.length > 0 ? byName : soleTimeframes);
    return { ...loc, timeframes };
  });

  return {
    defaultDate: nextBookableDay(lastBookedDate, prefs),
    maxDays,
    spaces: spacesWithTimeframes,
    // Only use an ID resolved from the spaces tree — primaryRoom.location comes from a
    // different endpoint whose IDs don't match spaces, so it would never resolve a location.
    primaryLocation: primaryLocationId,
    // Only keep the primary room when its location resolved in the spaces tree; otherwise the form
    // would show the first location but fetch seats for a room that doesn't belong to it.
    primaryRoom: primaryLocationId ? primaryRoomId : undefined,
    favoriteSeatIds: favoriteSeats.map((s) => s.id),
  };
}

export default function Command(props: LaunchProps) {
  const contextDate = (props.launchContext as { defaultDate?: string } | undefined)?.defaultDate;

  const { data, isLoading, error } = useCachedPromise(fetchBookingFormData);
  const [date, setDate] = useState<Date | null | undefined>(contextDate ? new Date(contextDate) : undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [room, setRoom] = useState<string | undefined>(undefined);
  const [timeframeKey, setTimeframeKey] = useState<string | undefined>(undefined);
  const [dateError, setDateError] = useState<string | undefined>();
  const [timeframeError, setTimeframeError] = useState<string | undefined>();
  const [seatError, setSeatError] = useState<string | undefined>();

  useEffect(() => {
    if (data === undefined) return;
    if (date === undefined) setDate(data.defaultDate);
  }, [data]);

  // Compute effective selections inline so they're available on the same render as `data`,
  // avoiding the useEffect timing gap that causes the dropdown to initialize to the first item.
  const effectiveLocation = location ?? data?.primaryLocation ?? data?.spaces[0]?.id;
  const effectiveRoom = room ?? data?.primaryRoom ?? data?.spaces[0]?.floors[0]?.rooms[0]?.id;
  const selectedLocation = data?.spaces.find((l) => l.id === effectiveLocation);

  const currentLocationTimeframes = selectedLocation?.timeframes ?? [];
  const defaultTimeframeKey = currentLocationTimeframes[0]
    ? `${currentLocationTimeframes[0].from}|${currentLocationTimeframes[0].until}`
    : undefined;
  const effectiveTimeframeKey = timeframeKey ?? defaultTimeframeKey;
  const [fromTime, untilTime] = effectiveTimeframeKey?.split("|") ?? ["", ""];

  const dateStr = date ? toISODate(date) : "";
  const { data: availableSeats, isLoading: isLoadingSeats } = useCachedPromise(
    fetchAvailableSeats,
    [effectiveRoom ?? "", dateStr, fromTime, untilTime],
    { execute: !!effectiveRoom && !!date && !!effectiveTimeframeKey }
  );

  const favoriteSeatIds = new Set<string>(data?.favoriteSeatIds ?? []);
  const sortedSeats = [...(availableSeats ?? [])].sort((a, b) => {
    const aFav = favoriteSeatIds.has(a.resource);
    const bFav = favoriteSeatIds.has(b.resource);
    if (aFav !== bFav) return aFav ? -1 : 1;
    return a.resourceName.localeCompare(b.resourceName);
  });

  if (error) {
    return (
      <DesklyEmptyView
        title="Error"
        description={error instanceof Error ? error.message : "An unexpected error occurred."}
        icon={Icon.ExclamationMark}
      />
    );
  }

  async function handleSubmit(values: { date: Date | null; seat: string }) {
    let valid = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDays = data?.maxDays ?? 30;
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + maxDays + 1);

    if (!values.date) {
      setDateError("Please select a date.");
      valid = false;
    } else {
      const selected = new Date(values.date);
      selected.setHours(0, 0, 0, 0);
      if (selected < today || selected > endDate) {
        setDateError(`Date must be between today and ${endDate.toLocaleDateString()}.`);
        valid = false;
      } else {
        setDateError(undefined);
      }
    }

    if (!effectiveTimeframeKey) {
      setTimeframeError("Please select a timeframe.");
      valid = false;
    } else {
      setTimeframeError(undefined);
    }

    if (!values.seat) {
      setSeatError("Please select a seat.");
      valid = false;
    } else {
      setSeatError(undefined);
    }

    if (!valid || !values.date) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Booking seat…" });
    try {
      await bookSeat(values.date, values.seat, fromTime, untilTime);
      toast.style = Toast.Style.Success;
      toast.title = "Seat booked!";
      const bookedDate = new Date(values.date);
      bookedDate.setHours(0, 0, 0, 0);
      if (bookedDate.getTime() === today.getTime()) {
        await launchCommand({ name: "todays-booking", type: LaunchType.Background });
      }
      await popToRoot();
    } catch (e) {
      failToast(toast, "Booking failed", e);
    }
  }

  return (
    <Form
      isLoading={isLoading || isLoadingSeats}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Book Seat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.DatePicker
        id="date"
        title="Date"
        type={Form.DatePicker.Type.Date}
        value={date ?? null}
        error={dateError}
        onChange={(newDate) => {
          setDate(newDate);
          setDateError(undefined);
        }}
      />
      <Form.Dropdown
        key={data ? "ready" : "loading"}
        id="location"
        title="Location"
        defaultValue={effectiveLocation}
        onChange={(value) => {
          setLocation(value);
          const loc = data?.spaces.find((l) => l.id === value);
          setRoom(loc?.floors[0]?.rooms[0]?.id);
          setTimeframeKey(undefined);
        }}
      >
        {(data?.spaces ?? []).map((loc) => (
          <Form.Dropdown.Item key={loc.id} value={loc.id} title={loc.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        key={`room-${effectiveLocation ?? "unset"}`}
        id="room"
        title="Floor / Room"
        defaultValue={effectiveRoom}
        onChange={(value) => setRoom(value)}
      >
        {(selectedLocation?.floors ?? []).flatMap((fl) =>
          fl.rooms.map((r) => <Form.Dropdown.Item key={r.id} value={r.id} title={`${fl.name} – ${r.name}`} />)
        )}
      </Form.Dropdown>
      <Form.Dropdown
        // Remount when the availability inputs change so a seat picked for a previous
        // room/date/timeframe can't linger in the field and be submitted against the new list.
        key={`seat-${effectiveRoom ?? "unset"}-${dateStr}-${effectiveTimeframeKey ?? "unset"}`}
        id="seat"
        title="Seat"
        error={seatError}
        onChange={() => setSeatError(undefined)}
      >
        {sortedSeats.map((r) => (
          <Form.Dropdown.Item
            key={r.resource}
            value={r.resource}
            title={favoriteSeatIds.has(r.resource) ? `⭐ ${r.resourceName}` : r.resourceName}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        key={`timeframe-${effectiveLocation ?? "unset"}`}
        id="timeframe"
        title="Timeframe"
        defaultValue={effectiveTimeframeKey}
        error={timeframeError}
        onChange={(value) => {
          setTimeframeKey(value);
          setTimeframeError(undefined);
        }}
      >
        {currentLocationTimeframes.map((tf) => (
          <Form.Dropdown.Item
            key={`${tf.from}|${tf.until}`}
            value={`${tf.from}|${tf.until}`}
            title={tf.name.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
