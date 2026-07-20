import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { AuthData, Booking, BookingSeat, Information, PresentPerson } from "../lib/types";
import { pad2, toISODate } from "../lib/format";
import { Jimp, JimpMime, rgbaToInt } from "jimp";

const roomPlanImageCache = new Map<string, Promise<string | null>>();

const INFORMATION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function jsonAuthHeaders(authData: AuthData): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authData.token}`,
  };
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
}

async function authenticatedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const authData = await fetchAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...jsonAuthHeaders(authData),
      ...init.headers,
    },
  });

  await throwIfNotOk(response);
  return response;
}

async function fetchAuthenticatedJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, init);
  return (await response.json()) as T;
}

interface CachedInformation {
  information: Information;
  fetchedAt: number;
}

export async function fetchInformation(): Promise<Information> {
  const preferences = getPreferenceValues<Preferences>();

  const cached = await LocalStorage.getItem<string>("information");
  if (cached) {
    const parsed = JSON.parse(cached) as CachedInformation;
    if (parsed.fetchedAt && parsed.fetchedAt + INFORMATION_TTL_MS > new Date().getTime()) {
      return parsed.information;
    }
  }

  const information = await fetchAuthenticatedJson<Information>(preferences.apiUrl + "/en/api/information");
  await LocalStorage.setItem("information", JSON.stringify({ information, fetchedAt: new Date().getTime() }));
  return information;
}

export async function fetchBookings(year: number, month: number): Promise<Booking[]> {
  const preferences = getPreferenceValues<Preferences>();
  const authData = await fetchAccessToken();
  const information = await fetchInformation();

  const response = await fetch(
    preferences.apiUrl + `/en/api/dayBookings/user/${information.user.id}/year/${year}/month/${pad2(month)}`,
    {
      method: "GET",
      headers: jsonAuthHeaders(authData),
    }
  );

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
  const preferences = getPreferenceValues<Preferences>();
  return fetchAuthenticatedJson<BookingSeat[]>(preferences.apiUrl + "/en/api/user/favorite/seats", { method: "GET" });
}

export async function bookSeat(date: Date, seat: BookingSeat, fromTime: string, untilTime: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const information = await fetchInformation();

  const datePrefix = toISODate(date);

  await authenticatedFetch(preferences.apiUrl + "/en/api/resource-booking", {
    method: "POST",
    body: JSON.stringify({
      email: false,
      user: information.user.id,
      resource: seat.id,
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
}

export async function fetchPresentResources(locationId: string, date: string): Promise<PresentPerson[]> {
  const preferences = getPreferenceValues<Preferences>();
  return fetchAuthenticatedJson<PresentPerson[]>(
    `${preferences.apiUrl}/en/api/resource/present/${locationId}?date=${date}`
  );
}

export async function checkInBooking(bookingId: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  await authenticatedFetch(`${preferences.apiUrl}/en/api/dayBooking/${bookingId}/checkin`, { method: "PUT" });
}

export async function deleteBooking(bookingId: string): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  await authenticatedFetch(preferences.apiUrl + `/en/api/dayBooking/${bookingId}/delete`, { method: "DELETE" });
}

export function fetchRoomPlanImage(roomId: string, seat: BookingSeat): Promise<string | null> {
  const cacheKey = `${roomId}:${seat.id}`;
  const cached = roomPlanImageCache.get(cacheKey);
  if (cached) return cached;

  const promise = (async () => {
    const preferences = getPreferenceValues<Preferences>();
    const authData = await fetchAccessToken();

    const response = await fetch(`${preferences.apiUrl}/en/image/room-plan/${roomId}`, {
      headers: { Authorization: `Bearer ${authData.token}` },
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    const image = await Jimp.fromBuffer(buffer);

    if (seat.locationX != null && seat.locationY != null) {
      const sizeMultiplier =
        preferences.seatIndicatorSize === "S" ? 0.0075 : preferences.seatIndicatorSize === "L" ? 0.02 : 0.0125;
      const r = Math.round(image.width * sizeMultiplier);
      const colorMap: Record<string, [number, number, number]> = {
        blue: [0x18, 0x46, 0xb9],
        red: [0xd9, 0x1e, 0x18],
        green: [0x1e, 0xa3, 0x4a],
        black: [0x1a, 0x1a, 0x1a],
      };
      const [cr, cg, cb] = colorMap[preferences.seatIndicatorColor] ?? colorMap.blue;
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
