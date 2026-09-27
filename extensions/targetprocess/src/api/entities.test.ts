import { describe, expect, it } from "vitest";

import { byRecency, mapEntity, mapCollection } from "./entities";
import { parseApiDate, sortableTime } from "./dates";

const row = {
  Id: 145322,
  Name: "Login page rejects valid passwords",
  EntityType: { Name: "Bug" },
  EntityState: { Id: 82, Name: "In Progress", IsFinal: false, NumericPriority: 2.5 },
  Project: { Name: "Platform" },
  ModifyDate: "/Date(1740067200000+0000)/",
};

describe("parseApiDate", () => {
  it("parses the ASP.NET format Targetprocess actually returns", () => {
    expect(parseApiDate("/Date(1740067200000+0000)/")?.toISOString()).toBe("2025-02-20T16:00:00.000Z");
  });

  it("ignores the offset, since the milliseconds are already absolute", () => {
    const utc = parseApiDate("/Date(1740067200000+0000)/")?.getTime();
    expect(parseApiDate("/Date(1740067200000-0500)/")?.getTime()).toBe(utc);
  });

  it("still accepts ISO, in case an endpoint returns it", () => {
    expect(parseApiDate("2025-02-20T16:00:00Z")?.toISOString()).toBe("2025-02-20T16:00:00.000Z");
  });

  it("returns null rather than an Invalid Date", () => {
    expect(parseApiDate("not a date")).toBeNull();
    expect(parseApiDate("")).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
    expect(parseApiDate("/Date()/")).toBeNull();
  });
});

describe("sortableTime", () => {
  it("sorts undated items last rather than first", () => {
    expect(sortableTime(null)).toBe(Number.NEGATIVE_INFINITY);
    expect(sortableTime("/Date(0+0000)/")).toBe(0);
  });
});

describe("mapEntity", () => {
  it("maps a full row", () => {
    expect(mapEntity(row)).toEqual({
      id: 145322,
      name: "Login page rejects valid passwords",
      type: "Bug",
      state: { id: 82, name: "In Progress", isFinal: false, numericPriority: 2.5 },
      projectName: "Platform",
      modifyDate: "2025-02-20T16:00:00.000Z",
    });
  });

  it("takes the type from EntityType, never the row's own base ResourceType", () => {
    const mapped = mapEntity({ ...row, ResourceType: "Assignable" } as typeof row);
    expect(mapped?.type).toBe("Bug");
  });

  it("falls back to Unknown when the type was not requested, since it may not be assignable", () => {
    expect(mapEntity({ Id: 1, Name: "x" })?.type).toBe("Unknown");
  });

  it("survives a missing state, project or date", () => {
    expect(mapEntity({ Id: 1, Name: "x" })).toEqual({
      id: 1,
      name: "x",
      type: "Unknown",
      state: null,
      projectName: null,
      modifyDate: null,
    });
  });

  it("treats a state without a usable name as absent", () => {
    expect(mapEntity({ ...row, EntityState: { Id: 3 } })?.state).toBeNull();
  });

  it("defaults an absent workflow position to zero rather than NaN", () => {
    const state = mapEntity({ ...row, EntityState: { Id: 3, Name: "Open" } })?.state;
    expect(state?.numericPriority).toBe(0);
    expect(state?.isFinal).toBe(false);
  });

  it("drops a row that cannot be opened or displayed", () => {
    expect(mapEntity({ Name: "no id" })).toBeNull();
    expect(mapEntity({ Id: 5 })).toBeNull();
  });
});

describe("mapCollection", () => {
  it("keeps the usable rows and drops the rest", () => {
    const mapped = mapCollection({ Items: [row, { Name: "broken" }, { Id: 2, Name: "fine" }] });
    expect(mapped.map((item) => item.id)).toEqual([145322, 2]);
  });

  it("handles a response with no items", () => {
    expect(mapCollection({})).toEqual([]);
  });
});

describe("byRecency", () => {
  it("puts the most recently modified first and undated last", () => {
    const items = mapCollection({
      Items: [
        { Id: 1, Name: "old", ModifyDate: "/Date(1000+0000)/" },
        { Id: 2, Name: "undated" },
        { Id: 3, Name: "new", ModifyDate: "/Date(9000+0000)/" },
      ],
    });
    expect(byRecency(items).map((item) => item.id)).toEqual([3, 1, 2]);
  });

  it("does not mutate its input", () => {
    const items = mapCollection({
      Items: [
        { Id: 1, Name: "a" },
        { Id: 2, Name: "b", ModifyDate: "/Date(1+0000)/" },
      ],
    });
    byRecency(items);
    expect(items.map((item) => item.id)).toEqual([1, 2]);
  });
});
