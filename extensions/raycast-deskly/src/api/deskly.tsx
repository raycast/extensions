import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { AuthData, Booking, BookingSeat, Information, Location, PresentPerson, Resource } from "../lib/types";
import { pad2, toISODate } from "../lib/format";
import { Jimp, JimpMime, rgbaToInt } from "jimp";

const roomPlanImageCache = new Map<string, Promise<string | null>>();

const INFORMATION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// Seat-indicator overlay tunables (driven by the seatIndicatorSize / seatIndicatorColor preferences).
// Size is a fraction of the room-plan image width; M is the default.
const SEAT_INDICATOR_SIZE: Record<string, number> = { S: 0.0075, M: 0.0125, L: 0.02 };
const SEAT_INDICATOR_COLOR: Record<string, [number, number, number]> = {
  blue: [0x18, 0x46, 0xb9],
  red: [0xd9, 0x1e, 0x18],
  green: [0x1e, 0xa3, 0x4a],
  black: [0x1a, 0x1a, 0x1a],
};

interface CachedInformation {
  information: Information;
  fetchedAt: number;
}

async function desklyFetch(path: string, init?: RequestInit): Promise<Response> {
  const { apiUrl } = getPreferenceValues<Preferences>();
  const authData = await fetchAccessToken();
  const { headers, ...rest } = init ?? {};
  return fetch(apiUrl + path, {
    ...rest,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authData.token}`, ...headers },
  });
}

/** Throws a uniform `<status> <statusText>: <body>` error when the response is not ok. */
async function assertOk(res: Response): Promise<Response> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res;
}

export async function fetchInformation(): Promise<Information> {
  const cached = await LocalStorage.getItem<string>("information");
  if (cached) {
    const parsed = JSON.parse(cached) as CachedInformation;
    if (parsed.fetchedAt && parsed.fetchedAt + INFORMATION_TTL_MS > new Date().getTime()) {
      return parsed.information;
    }
  }

  const response = await assertOk(await desklyFetch("/en/api/information"));
  const information = (await response.json()) as Information;
  await LocalStorage.setItem("information", JSON.stringify({ information, fetchedAt: new Date().getTime() }));
  return information;
}

export async function fetchBookings(year: number, month: number): Promise<Booking[]> {
  const information = await fetchInformation();

  const response = await desklyFetch(
    `/en/api/dayBookings/user/${information.user.id}/year/${year}/month/${pad2(month)}`,
    { method: "GET" }
  );

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);

  // This endpoint returns 200 with a non-array body when the token is invalid — the array shape is
  // the real signal for that case.
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Refresh token expired or invalid. Please update it in the extension preferences.");
  }
  return (data as Booking[]).map((booking) => {
    booking.date = new Date(booking.date);
    return booking;
  });
}

export async function fetchFavoriteSeats(): Promise<BookingSeat[]> {
  const response = await assertOk(await desklyFetch("/en/api/user/favorite/seats", { method: "GET" }));
  return (await response.json()) as BookingSeat[];
}

export async function fetchSpaces(): Promise<Location[]> {
  const response = await assertOk(await desklyFetch("/de/api/space/list"));
  const data = (await response.json()) as { locations: Location[] };
  return data.locations;
}

export async function fetchAvailableSeats(
  roomId: string,
  dateStr: string,
  fromTime: string,
  untilTime: string
): Promise<Resource[]> {
  const response = await assertOk(
    await desklyFetch(`/en/api/resource/room/usage/list/${roomId}`, {
      method: "POST",
      body: JSON.stringify({
        dateTimes: [{ from: `${dateStr}T${fromTime}:00`, until: `${dateStr}T${untilTime}:00` }],
      }),
    })
  );
  return (await response.json()) as Resource[];
}

export async function bookSeat(date: Date, resourceId: string, fromTime: string, untilTime: string): Promise<void> {
  const information = await fetchInformation();
  const datePrefix = toISODate(date);

  const response = await desklyFetch("/en/api/resource-booking", {
    method: "POST",
    body: JSON.stringify({
      email: false,
      user: information.user.id,
      resource: resourceId,
      guestName: null,
      guestEmail: null,
      guestCompany: null,
      guestAnonymous: false,
      resourceBookings: [
        {
          from: `${datePrefix}T${fromTime}:00`,
          until: `${datePrefix}T${untilTime}:00`,
          bookedCapacity: 1,
          cateringServiceText: null,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let detail: string | undefined;
    try {
      detail = (JSON.parse(body) as { detail?: string }).detail;
    } catch {
      // Non-JSON error body — fall through to the generic message below.
    }
    throw new Error(detail ?? `${response.status} ${response.statusText}: ${body}`);
  }
}

export async function fetchPresentResources(locationId: string, date: string): Promise<PresentPerson[]> {
  const response = await assertOk(await desklyFetch(`/en/api/resource/present/${locationId}?date=${date}`));
  return (await response.json()) as PresentPerson[];
}

export async function checkInBooking(bookingId: string): Promise<void> {
  const res = await desklyFetch(`/en/api/dayBooking/${bookingId}/checkin`, { method: "PUT" });
  if (res.status === 403) throw new Error("Check-in is not available yet. Try again closer to your booking time.");
  await assertOk(res);
}

export async function deleteBooking(bookingId: string): Promise<void> {
  await assertOk(await desklyFetch(`/en/api/dayBooking/${bookingId}/delete`, { method: "DELETE" }));
}

export function fetchRoomPlanImage(roomId: string, seat: BookingSeat): Promise<string | null> {
  const cacheKey = `${roomId}:${seat.id}`;
  const cached = roomPlanImageCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const preferences = getPreferenceValues<Preferences>();
    const response = await desklyFetch(`/en/image/room-plan/${roomId}`);

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const image = await Jimp.fromBuffer(buffer);

    if (seat.locationX != null && seat.locationY != null) {
      const sizeMultiplier = SEAT_INDICATOR_SIZE[preferences.seatIndicatorSize] ?? SEAT_INDICATOR_SIZE.M;
      const r = Math.round(image.width * sizeMultiplier);
      const [cr, cg, cb] = SEAT_INDICATOR_COLOR[preferences.seatIndicatorColor] ?? SEAT_INDICATOR_COLOR.blue;
      const color = rgbaToInt(cr, cg, cb, 255);
      for (let y = Math.max(0, seat.locationY - r); y <= Math.min(image.height - 1, seat.locationY + r); y++) {
        for (let x = Math.max(0, seat.locationX - r); x <= Math.min(image.width - 1, seat.locationX + r); x++) {
          if ((x - seat.locationX) ** 2 + (y - seat.locationY) ** 2 <= r * r) {
            image.setPixelColor(color, x, y);
          }
        }
      }
    }

    const outBuffer = await image.getBuffer(JimpMime.png);
    return `data:image/png;base64,${outBuffer.toString("base64")}`;
  })();

  promise.catch(() => roomPlanImageCache.delete(cacheKey));
  roomPlanImageCache.set(cacheKey, promise);
  return promise;
}

async function fetchAccessToken(): Promise<AuthData> {
  const preferences = getPreferenceValues<Preferences>();

  const cached = await LocalStorage.getItem<string>("authData");
  const authData: AuthData | null = cached ? (JSON.parse(cached) as AuthData) : null;

  if (authData && authData.tokenExpiration > new Date().getTime()) {
    return authData;
  }

  const response = await fetch(preferences.apiUrl + "/en/api/authorize/refreshToken", {
    method: "POST",
    body: JSON.stringify({ refreshToken: preferences.refreshToken }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    await LocalStorage.removeItem("authData");
    throw new Error("Refresh token expired or invalid. Please update it in the extension preferences.");
  }

  const freshAuthData = (await response.json()) as AuthData;
  await LocalStorage.setItem("authData", JSON.stringify(freshAuthData));
  return freshAuthData;
}
