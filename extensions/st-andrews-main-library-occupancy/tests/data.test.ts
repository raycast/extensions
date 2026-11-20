import assert from "node:assert/strict";
import { test } from "node:test";
import {
  congestionHue,
  mergeComputers,
  mergeOccupancy,
  parseAverageVisit,
  parseBusiestHour,
  parseComputers,
  parseOccupancy,
  sortByAvailability,
} from "../src/data";

test("partial responses retain previously available fields while uncached fields stay incomplete", () => {
  const first = mergeOccupancy(parseOccupancy({ total: 0, capacity: 1500, student: 0 }));
  assert.equal(first.data.rate, 0);
  assert.equal(first.complete, false);
  const next = mergeOccupancy(parseOccupancy({ staff: 0, other: 0 }), first.data);
  assert.equal(next.complete, true);
  assert.equal(next.data.students, 0);

  const oldRooms = parseComputers({ rooms: [{ name: "Lab", total: 10, available: { count: 0 } }] });
  const partialRooms = parseComputers({
    rooms: [
      { name: "New lab", total: 5 },
      { name: "Lab", total: 10 },
    ],
  });
  const combined = mergeComputers(partialRooms, oldRooms);
  assert.equal(combined.complete, false);
  assert.deepEqual(
    combined.data.map(({ name, available }) => [name, available]),
    [
      ["New lab", undefined],
      ["Lab", 0],
    ],
  );
});

test("occupancy keeps over-capacity totals but only calculates rates from valid counts", () => {
  const occupancy = parseOccupancy({ total: 812, capacity: 1_000 });
  assert.equal(occupancy.rate, 0.812);
  assert.equal(occupancy.remaining, 188);
  const overCapacity = parseOccupancy({ total: 1_100, capacity: 1_000 });
  assert.equal(overCapacity.rate, 1.1);
  assert.equal(overCapacity.remaining, 0);
  assert.equal(parseOccupancy({ total: 12, capacity: 0 }).rate, undefined);
  assert.equal(parseOccupancy({ total: -1, capacity: 1_000 }).remaining, undefined);
  assert.throws(() => parseOccupancy({}));
  assert.deepEqual([0, 0.5, 0.75, 1, 1.1].map(congestionHue), [120, 60, 30, 0, 0]);
});

test("room sorting uses counts, keeps ties in API order and preserves the source", () => {
  const rooms = parseComputers({
    rooms: [
      { name: "No PCs", total: 0, available: { count: 0 } },
      { name: "Lab", total: 40, available: { count: 24 } },
      { name: "Lab", total: 30, available: { count: 24 } },
      { name: "Unknown", total: 2, available: { count: 3 } },
      { name: "Closed", total: 8 },
      { name: "Large lab", total: 80, available: { count: 30 } },
    ],
  });
  assert.equal(rooms[1].rate, 0.6);
  assert.equal(rooms[0].rate, undefined);
  assert.equal(rooms[3].available, undefined);
  assert.equal(rooms[4].available, undefined);
  assert.equal(new Set(rooms.map(({ id }) => id)).size, rooms.length);
  assert.deepEqual(sortByAvailability(rooms), [rooms[5], rooms[1], rooms[2], rooms[0], rooms[3], rooms[4]]);
  assert.equal(rooms[0].name, "No PCs");
  assert.throws(() => parseComputers({}));
});

test("summary metrics validate the observed JSON and plain-text responses", () => {
  assert.equal(parseAverageVisit({ hours: 1, minutes: 38 }), "1h 38m");
  assert.equal(parseBusiestHour("00:00"), "12 AM");
  assert.equal(parseBusiestHour("09:00"), "9 AM");
  assert.equal(parseBusiestHour("12:00"), "12 PM");
  assert.equal(parseBusiestHour("13:00\n"), "1 PM");
  assert.equal(parseBusiestHour("13:30"), "1:30 PM");
  assert.equal(parseBusiestHour("15:30"), "3:30 PM");
  assert.equal(parseBusiestHour("23:00"), "11 PM");
  assert.throws(() => parseAverageVisit({ hours: 1, minutes: 60 }));
  assert.throws(() => parseBusiestHour("Unavailable"));
  assert.throws(() => parseBusiestHour("24:00"));
  assert.throws(() => parseBusiestHour(""));
});
