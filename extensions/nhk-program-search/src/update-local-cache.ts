import { Cache, environment, showToast, Toast, updateCommandMetadata } from "@raycast/api";
import fetch from "node-fetch";
import { preferences } from "./preferences";
import { Genre, Program, serviceIdLogos, serviceIds, serviceIdsWithoutAll, ServiceId, genres } from "./types";
import { getFormattedDate } from "./utils";

const END_POINT = "https://program-api.nhk.jp/v3/papiPgDateTv";
const cache = new Cache();
const genreSet = new Set<string>(genres);
type BroadcastServiceId = Exclude<ServiceId, "all">;

type V3Logo = {
  url?: string;
  width?: number;
  height?: number;
};

type V3BroadcastService = {
  name?: string;
  logo?: {
    main?: V3Logo;
    medium?: V3Logo;
    small?: V3Logo;
  };
};

type V3Genre = {
  id?: string;
};

type V3Act = {
  role?: string;
  name?: string;
};

type V3BroadcastEvent = {
  id?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: {
    id?: string;
    name?: string;
  };
  identifierGroup?: {
    eventId?: string;
    broadcastEventId?: string;
    genre?: V3Genre[];
  };
  misc?: {
    actList?: V3Act[];
  };
  about?: {
    name?: string;
    description?: string;
  };
};

type V3ScheduleByService = {
  publishedOn?: V3BroadcastService[];
  publication?: V3BroadcastEvent[];
};

type V3ErrorResponse = {
  error?: {
    px?: {
      code?: number;
      message?: string[];
      requestId?: string;
    };
  };
};

type V3DateResponse = V3ErrorResponse &
  Partial<{
    [key in BroadcastServiceId]: V3ScheduleByService;
  }>;

export default async function Command() {
  const tempPrevCache = getPrevCacheAndClear();

  try {
    await storeWeeklyProgramsCache();
    await updateCommandMetadata({ subtitle: `Last Update: ${getFormattedDate(new Date(), "YYYY-MM-DD HH:mm")}` });
    if (environment.launchType === "userInitiated") {
      await showToast({
        style: Toast.Style.Success,
        title: "Successfully fetched data",
      });
    }
  } catch (error) {
    if (environment.launchType === "userInitiated") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch data",
        message: error instanceof Error ? error.message : "An error occurred while fetching data.",
      });
    }

    // restore prev data
    serviceIds.forEach((sid) => {
      cache.set(sid, JSON.stringify(tempPrevCache[sid]));
    });
  }
}

async function storeWeeklyProgramsCache(): Promise<void> {
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const jstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
    jstDate.setDate(jstDate.getDate() + i);
    return jstDate.toISOString().split("T")[0];
  });

  for (const date of weekDates) {
    await Promise.all(
      serviceIdsWithoutAll.map(async (serviceId) => {
        const response = await fetchProgramDateTv(serviceId, date);
        const newPrograms = convertResponseToPrograms(response, serviceId);
        const existed = JSON.parse(cache.get(serviceId) ?? "[]") as Program[];
        const mergedPrograms = mergePrograms(existed, newPrograms);
        cache.set(serviceId, JSON.stringify(mergedPrograms));
      }),
    );
  }
}

function getPrevCacheAndClear() {
  const prevCache: { [key: string]: Program[] } = {};
  serviceIds.forEach((sid) => {
    const data = JSON.parse(cache.get(sid) ?? "[]") as Program[];
    prevCache[sid] = data;
    return data;
  });
  serviceIds.forEach(cache.remove);
  return prevCache;
}

async function fetchProgramDateTv(serviceId: BroadcastServiceId, date: string): Promise<V3DateResponse> {
  const searchParams = new URLSearchParams({
    service: serviceId,
    area: preferences.area,
    date,
    key: preferences.apiKey,
  });
  const response = await fetch(`${END_POINT}?${searchParams.toString()}`);
  const json = (await response.json()) as V3DateResponse;

  if (!response.ok || json.error) {
    throw new Error(buildApiErrorMessage(json, response.status, serviceId, date));
  }

  return json;
}

function buildApiErrorMessage(
  responseBody: V3DateResponse,
  statusCode: number,
  serviceId: BroadcastServiceId,
  date: string,
): string {
  const apiMessage = responseBody.error?.px?.message?.join(" / ");
  const requestId = responseBody.error?.px?.requestId;
  const details = [apiMessage, requestId ? `requestId: ${requestId}` : undefined].filter(Boolean).join(" | ");
  if (details.length > 0) {
    return `[${serviceId} ${date}] ${details}`;
  }
  return `[${serviceId} ${date}] API request failed with status ${statusCode}`;
}

function convertResponseToPrograms(response: V3DateResponse, serviceId: BroadcastServiceId): Program[] {
  const schedule = response[serviceId];
  if (!schedule) {
    return [];
  }

  const service = buildProgramService(serviceId, schedule.publishedOn?.[0]);
  const publications = schedule.publication ?? [];

  return publications.map((publication) => {
    const title = publication.name ?? "";
    const subtitle = publication.about?.name ?? "";
    const content = publication.description ?? publication.about?.description ?? "";

    return {
      id: publication.id ?? publication.identifierGroup?.broadcastEventId ?? "",
      event_id: publication.identifierGroup?.eventId ?? "",
      start_time: publication.startDate ?? "",
      end_time: publication.endDate ?? "",
      area: {
        id: publication.location?.id ?? preferences.area,
        name: publication.location?.name ?? "",
      },
      service,
      title,
      subtitle,
      content,
      act: buildActString(publication.misc?.actList ?? []),
      genres: normalizeGenres(publication.identifierGroup?.genre ?? []),
    };
  });
}

function mergePrograms(base: Program[], additional: Program[]): Program[] {
  const merged = new Map<string, Program>();
  [...base, ...additional].forEach((program) => {
    merged.set(`${program.id}:${program.start_time}`, program);
  });
  return Array.from(merged.values()).sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

function buildProgramService(serviceId: BroadcastServiceId, serviceData?: V3BroadcastService): Program["service"] {
  const logoSmall = serviceData?.logo?.small;
  const logoMedium = serviceData?.logo?.medium ?? serviceData?.logo?.main ?? logoSmall;
  const logoLarge = serviceData?.logo?.main ?? logoMedium ?? logoSmall;

  return {
    id: serviceId,
    name: serviceData?.name ?? serviceId,
    logo_s: toProgramLogo(logoSmall, serviceId),
    logo_m: toProgramLogo(logoMedium, serviceId),
    logo_l: toProgramLogo(logoLarge, serviceId),
  };
}

function toProgramLogo(logo: V3Logo | undefined, serviceId: BroadcastServiceId) {
  return {
    url: logo?.url ?? serviceIdLogos[serviceId],
    width: String(logo?.width ?? 0),
    height: String(logo?.height ?? 0),
  };
}

function normalizeGenres(genreList: V3Genre[]): Genre[] {
  return genreList
    .map((genre) => genre.id)
    .filter((genreId): genreId is Genre => typeof genreId === "string" && genreSet.has(genreId));
}

function buildActString(actList: V3Act[]): string {
  const byRole = new Map<string, string[]>();

  actList.forEach((act) => {
    if (!act.name) {
      return;
    }
    const role = act.role && act.role.length > 0 ? act.role : "出演";
    const names = byRole.get(role);
    if (names) {
      names.push(act.name);
      return;
    }
    byRole.set(role, [act.name]);
  });

  return Array.from(byRole.entries())
    .map(([role, names]) => `【${role}】${names.join("，")}`)
    .join("");
}
