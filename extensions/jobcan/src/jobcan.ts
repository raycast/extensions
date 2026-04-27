import { load } from "cheerio";
import type { AttendanceDay, AttendanceMonth, AttendanceStatus, SubmitAttendanceOptions } from "./types";

const LOGIN_URL = "https://id.jobcan.jp/users/sign_in?app_key=atd&redirect_to=https://ssl.jobcan.jp/jbcoauth/callback";
const ATTENDANCE_URL = "https://ssl.jobcan.jp/employee/attendance";
const MODIFY_URL = "https://ssl.jobcan.jp/employee/adit/modify";

type Cookie = {
  name: string;
  value: string;
  domain?: string;
  path: string;
};

class CookieJar {
  private cookies = new Map<string, Cookie>();

  store(response: Response, url: URL) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headers.getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie"));

    for (const setCookie of setCookies) {
      const [nameValue, ...attributes] = setCookie.split(";").map((part) => part.trim());
      const separatorIndex = nameValue.indexOf("=");
      if (separatorIndex === -1) continue;

      const cookie: Cookie = {
        name: nameValue.slice(0, separatorIndex),
        value: nameValue.slice(separatorIndex + 1),
        domain: url.hostname,
        path: "/",
      };

      for (const attribute of attributes) {
        const [rawName, ...rawValue] = attribute.split("=");
        const attributeName = rawName.toLowerCase();
        const attributeValue = rawValue.join("=");

        if (attributeName === "domain" && attributeValue) cookie.domain = attributeValue.replace(/^\./, "");
        if (attributeName === "path" && attributeValue) cookie.path = attributeValue;
      }

      this.cookies.set(`${cookie.domain ?? url.hostname}:${cookie.path}:${cookie.name}`, cookie);
    }
  }

  header(url: URL): string {
    const matchingCookies = Array.from(this.cookies.values()).filter((cookie) => {
      const domain = cookie.domain ?? url.hostname;
      return url.hostname === domain || url.hostname.endsWith(`.${domain}`);
    });

    return matchingCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  }
}

export async function fetchAttendanceMonth({
  username,
  password,
  year,
  month,
}: {
  username: string;
  password: string;
  year: number;
  month: number;
}): Promise<AttendanceMonth> {
  const jar = new CookieJar();
  await login({ username, password, jar });

  const url = new URL(ATTENDANCE_URL);
  url.searchParams.set("list_type", "normal");
  url.searchParams.set("search_type", "month");
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));

  const response = await request(url, { method: "GET" }, jar);
  const html = await response.text();
  return parseAttendanceMonth(html, year, month);
}

export function getModifyUrl(year: number, month: number, day: number): string {
  const url = new URL(MODIFY_URL);
  url.searchParams.set("year", String(year));
  url.searchParams.set("month", String(month));
  url.searchParams.set("day", String(day));
  return url.toString();
}

export async function submitAttendanceDay(options: SubmitAttendanceOptions): Promise<void> {
  const jar = new CookieJar();
  await login({ username: options.username, password: options.password, jar });
  await submitAttendanceDayWithSession(options, jar);
}

export async function submitAttendanceDays(options: {
  username: string;
  password: string;
  days: Array<{ year: number; month: number; day: number }>;
  startTime: string;
  endTime: string;
  notice: string;
}): Promise<void> {
  const jar = new CookieJar();
  await login({ username: options.username, password: options.password, jar });

  for (const day of options.days) {
    await submitAttendanceDayWithSession({ ...options, ...day }, jar);
  }
}

async function submitAttendanceDayWithSession(options: SubmitAttendanceOptions, jar: CookieJar): Promise<void> {
  const form = await fetchModifyForm(options, jar);
  const [lowerTime, higherTime] = normalizeOrderedTimes(options.startTime, options.endTime);

  await submitAditTime(form, lowerTime, options.notice, jar);
  await submitAditTime(form, higherTime, options.notice, jar);
}

async function fetchModifyForm(
  options: Pick<SubmitAttendanceOptions, "year" | "month" | "day">,
  jar: CookieJar,
): Promise<Record<string, string>> {
  const response = await request(
    new URL(getModifyUrl(options.year, options.month, options.day)),
    { method: "GET" },
    jar,
  );
  const html = await response.text();
  const $ = load(html);
  const form = $("form")
    .toArray()
    .map((element) => $(element))
    .find((element) => element.attr("action") === "/employee/adit/insert/");

  if (!form) {
    throw new Error(`Could not find the submit form for ${options.year}/${options.month}/${options.day}.`);
  }

  const values: Record<string, string> = {};
  form.find("input[type='hidden']").each((_, input) => {
    const name = $(input).attr("name");
    if (name) values[name] = $(input).attr("value") ?? "";
  });

  const selectedGroup = form.find("select[name='group_id'] option:selected").attr("value");
  const firstGroup = form.find("select[name='group_id'] option").first().attr("value");
  values.group_id = selectedGroup || firstGroup || "";

  if (!values.token || !values.year || !values.month || !values.day || !values.group_id) {
    throw new Error(`The submit form for ${options.year}/${options.month}/${options.day} is missing required fields.`);
  }

  return values;
}

async function submitAditTime(
  form: Record<string, string>,
  time: string,
  notice: string,
  jar: CookieJar,
): Promise<void> {
  const body = new URLSearchParams({
    ...form,
    time,
    notice,
  });

  const response = await request(
    new URL("/employee/adit/insert/", "https://ssl.jobcan.jp"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: getModifyUrl(Number(form.year), Number(form.month), Number(form.day)),
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    },
    jar,
  );
  const text = await response.text();

  if (text.includes("error") || text.includes("エラー")) {
    throw new Error(`Jobcan rejected ${form.year}/${form.month}/${form.day} ${time}.`);
  }
}

async function login({ username, password, jar }: { username: string; password: string; jar: CookieJar }) {
  const loginPage = await request(new URL(LOGIN_URL), { method: "GET" }, jar);
  const loginHtml = await loginPage.text();
  const $ = load(loginHtml);
  const token = $("input[name='authenticity_token']").attr("value");

  if (!token) {
    throw new Error("Could not find Jobcan login token.");
  }

  const body = new URLSearchParams({
    authenticity_token: token,
    "user[email]": username,
    "user[password]": password,
    "user[client_code]": "",
    save_sign_in_information: "false",
    app_key: "atd",
    redirect_to: "https://ssl.jobcan.jp/jbcoauth/callback",
    commit: "ログイン",
  });

  const response = await request(
    new URL(LOGIN_URL),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://id.jobcan.jp",
        Referer: LOGIN_URL,
      },
      body,
    },
    jar,
  );

  const html = await response.text();
  if (response.url.includes("/users/sign_in") && html.includes("new_user")) {
    throw new Error("Jobcan login failed. Check the configured username and password.");
  }
}

async function request(url: URL, init: RequestInit, jar: CookieJar, redirectCount = 0): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookieHeader = jar.header(url);
  if (cookieHeader) headers.set("Cookie", cookieHeader);
  headers.set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Jobcan-RayCast");

  const response = await fetch(url, { ...init, headers, redirect: "manual" });
  jar.store(response, url);

  if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
    if (redirectCount > 10) throw new Error("Too many Jobcan redirects.");
    return request(new URL(response.headers.get("location") ?? "", url), { method: "GET" }, jar, redirectCount + 1);
  }

  if (!response.ok) {
    throw new Error(`Jobcan request failed with HTTP ${response.status}.`);
  }

  return response;
}

export function parseAttendanceMonth(html: string, year: number, month: number): AttendanceMonth {
  const $ = load(html);
  const table = $("table")
    .toArray()
    .find((element) => {
      const headers = $(element)
        .find("tr")
        .first()
        .find("th,td")
        .map((_, cell) => normalize($(cell).text()))
        .get();
      return headers.includes("日付") && headers.includes("出勤時刻") && headers.includes("退勤時刻");
    });

  if (!table) {
    throw new Error("Could not find the attendance table in Jobcan.");
  }

  const days: AttendanceDay[] = [];
  $(table)
    .find("tr")
    .slice(1)
    .each((_, row) => {
      const cells = $(row)
        .find("td,th")
        .map((__, cell) => normalize($(cell).text()))
        .get();

      if (cells.length < 11 || cells[0] === "合計") return;

      const match = cells[0].match(/(\d{2})\/(\d{2})\((.)\)/);
      if (!match) return;

      const day = Number(match[2]);
      const date = new Date(year, month - 1, day);
      const dayData = {
        date,
        day,
        weekday: match[3],
        isPending: ($(row).attr("class") ?? "").includes("jbc-table-warning"),
        holidayType: cells[1],
        shift: cells[2],
        clockIn: cells[3],
        clockOut: cells[4],
        workTime: cells[5],
        breakTime: cells[9],
        statusText: cells[10],
      };

      days.push({
        ...dayData,
        status: getStatus(dayData),
      });
    });

  return { year, month, days };
}

function getStatus(day: {
  isPending: boolean;
  holidayType: string;
  clockIn: string;
  clockOut: string;
  statusText: string;
}): AttendanceStatus {
  if (day.isPending) return "pending";
  if (day.clockIn && day.clockOut) return "complete";
  if (day.clockIn || day.clockOut) return "partial";
  if (day.statusText.includes("欠")) return "absent";
  if (day.statusText.includes("遅") || day.statusText.includes("早")) return "late";
  if (day.holidayType.includes("休") || day.holidayType.includes("祝日")) return "holiday";
  return "empty";
}

function normalize(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

function normalizeTime(value: string): string {
  const normalized = value.replace(":", "").trim();
  if (!/^\d{4}$/.test(normalized)) {
    throw new Error(`Invalid time "${value}". Use HH:mm or HHmm.`);
  }
  return normalized;
}

function normalizeOrderedTimes(startTime: string, endTime: string): [string, string] {
  const times = [normalizeTime(startTime), normalizeTime(endTime)].sort();
  return [times[0], times[1]];
}

function splitSetCookieHeader(header: string | null): string[] {
  if (!header) return [];
  return header.split(/,(?=\s*[^;,]+=)/g);
}
