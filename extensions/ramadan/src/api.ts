import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import {
  Preferences,
  AladhanTimingsResponse,
  AladhanCalendarResponse,
} from "./types";
import { adjustHijriDate } from "./utils";

const ALADHAN_BASE = "https://api.aladhan.com/v1";

function normalizeLocationValue(value: string): string {
  const trimmed = value.trim();
  const withoutCommaTail = trimmed.includes(",")
    ? trimmed.split(",")[0]
    : trimmed;
  return withoutCommaTail.replace(/\s+/g, " ");
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

function getTodayDateForApi(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Get the user's configured location from preferences
 */
export function getLocation(): { city: string; country: string } {
  const prefs = getPreferenceValues<Preferences>();
  return {
    city: normalizeLocationValue(prefs.city),
    country: normalizeLocationValue(prefs.country),
  };
}

/**
 * Fetch today's prayer timings from Aladhan API
 */
export async function getTodayTimings(): Promise<AladhanTimingsResponse> {
  const prefs = getPreferenceValues<Preferences>();
  const { city, country } = getLocation();
  const method = prefs.method || "2";
  const date = getTodayDateForApi();

  if (!city || !country) {
    throw new Error("Please set both city and country in preferences.");
  }

  const url = `${ALADHAN_BASE}/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&_=${Date.now()}`;
  const data = await fetchJson<AladhanTimingsResponse>(url);
  const responseMethod = data.data?.meta?.method?.id;
  if (responseMethod !== parseInt(method, 10)) {
    throw new Error(
      `Calculation method mismatch: selected ${method}, API returned ${responseMethod}.`,
    );
  }

  return data;
}

/**
 * Fetch prayer timings for a specific date
 */
export async function getTimingsByDate(
  date: string,
  city: string,
  country: string,
  method: string,
): Promise<AladhanTimingsResponse> {
  const normalizedCity = normalizeLocationValue(city);
  const normalizedCountry = normalizeLocationValue(country);
  const url = `${ALADHAN_BASE}/timingsByCity/${date}?city=${encodeURIComponent(normalizedCity)}&country=${encodeURIComponent(normalizedCountry)}&method=${method}&_=${Date.now()}`;
  const data = await fetchJson<AladhanTimingsResponse>(url);
  const responseMethod = data.data?.meta?.method?.id;
  if (responseMethod !== parseInt(method, 10)) {
    throw new Error(
      `Calculation method mismatch for ${date}: selected ${method}, API returned ${responseMethod}.`,
    );
  }

  return data;
}

/**
 * Fetch Hijri calendar for a given Hijri month/year
 * month=9 is Ramadan
 */
export async function getHijriCalendar(
  month: number,
  year: number,
): Promise<AladhanCalendarResponse> {
  const prefs = getPreferenceValues<Preferences>();
  const { city, country } = getLocation();
  const method = prefs.method || "2";

  const url = `${ALADHAN_BASE}/hijriCalendarByCity/${year}/${month}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&_=${Date.now()}`;
  return await fetchJson<AladhanCalendarResponse>(url);
}

/**
 * Convert a Gregorian date to Hijri
 */
export async function getHijriDate(date: string): Promise<{
  hijriDay: string;
  hijriMonth: number;
  hijriMonthName: string;
  hijriYear: string;
}> {
  const url = `${ALADHAN_BASE}/gToH/${date}`;
  const data = await fetchJson<{
    data: {
      hijri: {
        day: string;
        month: { number: number; en: string };
        year: string;
      };
    };
  }>(url);

  const raw = data.data.hijri;
  const adjusted = adjustHijriDate(
    parseInt(raw.day, 10),
    raw.month.number,
    parseInt(raw.year, 10),
  );

  return {
    hijriDay: String(adjusted.day),
    hijriMonth: adjusted.month,
    hijriMonthName: adjusted.monthName,
    hijriYear: String(adjusted.year),
  };
}
