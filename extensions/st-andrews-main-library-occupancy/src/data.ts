const sentry = "https://www.st-andrews.ac.uk/library/sentry-api";

export const endpoints = {
  occupancy: `${sentry}/current-occupancy`,
  averageVisit: `${sentry}/average-visit`,
  busiestHour: `${sentry}/busiest-hour`,
  computers: "https://www.st-andrews.ac.uk/pc-availability/rest/4d8283a9-213d-30be-e054-00144ffbdcf6",
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function count(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export function parseOccupancy(value: unknown) {
  const data = record(value);
  const total = count(data.total);
  const capacity = count(data.capacity) || undefined;
  const students = count(data.student);
  const staff = count(data.staff);
  const visitors = count(data.other);
  if ([total, capacity, students, staff, visitors].every((field) => field === undefined)) {
    throw new Error("Invalid occupancy data");
  }
  return {
    total,
    capacity,
    students,
    staff,
    visitors,
    rate: total !== undefined && capacity !== undefined ? total / capacity : undefined,
    remaining: total !== undefined && capacity !== undefined ? Math.max(0, capacity - total) : undefined,
  };
}

export function mergeOccupancy(next: ReturnType<typeof parseOccupancy>, previous?: ReturnType<typeof parseOccupancy>) {
  const data = previous
    ? parseOccupancy({
        total: next.total ?? previous.total,
        capacity: next.capacity ?? previous.capacity,
        student: next.students ?? previous.students,
        staff: next.staff ?? previous.staff,
        other: next.visitors ?? previous.visitors,
      })
    : next;
  return {
    data,
    complete: [data.rate, data.students, data.staff, data.visitors].every((value) => value !== undefined),
  };
}

export function parseAverageVisit(value: unknown) {
  const data = record(value);
  const hours = count(data.hours);
  const minutes = count(data.minutes);
  if (hours === undefined || minutes === undefined || minutes >= 60) throw new Error("Invalid visit duration");
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function parseBusiestHour(value: string) {
  const time = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!time) throw new Error("Invalid busiest hour");
  const hour = Number(time[1]);
  const minutes = time[2] === "00" ? "" : `:${time[2]}`;
  return `${hour % 12 || 12}${minutes} ${hour < 12 ? "AM" : "PM"}`;
}

export function parseComputers(value: unknown) {
  const data = record(value);
  if (!Array.isArray(data.rooms)) throw new Error("Invalid computer data");

  const occurrences = new Map<string, number>();
  return data.rooms.map((value: unknown) => {
    const room = record(value);
    const name = typeof room.name === "string" && room.name.trim() ? room.name.trim() : "Unnamed room";
    const occurrence = (occurrences.get(name) ?? 0) + 1;
    occurrences.set(name, occurrence);

    const total = count(room.total);
    const reported = count(record(room.available).count);
    const available = reported !== undefined && (total === undefined || reported <= total) ? reported : undefined;

    return {
      id: JSON.stringify([name, occurrence]),
      name,
      total,
      available,
      rate: total && available !== undefined ? available / total : undefined,
    };
  });
}

export function mergeComputers(next: ReturnType<typeof parseComputers>, previous?: ReturnType<typeof parseComputers>) {
  const cachedRooms = new Map(previous?.map((room) => [room.id, room]));
  const data = next.map((room) => {
    const cached = cachedRooms.get(room.id);
    const total = room.total ?? cached?.total;
    const available = room.available ?? cached?.available;
    if (total !== undefined && available !== undefined && available > total) {
      return cached ?? room;
    }
    return { ...room, total, available, rate: total && available !== undefined ? available / total : undefined };
  });
  return { data, complete: data.every((room) => room.total !== undefined && room.available !== undefined) };
}

export function sortByAvailability(rooms: ReturnType<typeof parseComputers>) {
  return [...rooms].sort((a, b) => (b.available ?? -1) - (a.available ?? -1));
}

export function congestionHue(rate: number) {
  const percentage = Math.min(1, Math.max(0, rate));
  return percentage <= 0.5 ? 120 - 120 * percentage : 60 - 120 * (percentage - 0.5);
}
