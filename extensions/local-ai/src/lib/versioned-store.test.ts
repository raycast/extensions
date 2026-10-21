import { describe, expect, it } from "vitest";
import {
  backupKey,
  isNewerStore,
  loadVersionedStore,
  planVersionedLoad,
  type VersionedStoreSpec,
} from "./versioned-store";

type Store = { items: number[] };

const spec: VersionedStoreSpec<Store> = {
  version: 2,
  parse: (value) => {
    if (!Array.isArray(value.items)) return undefined;
    const entries = value.items as unknown[];
    const items = entries.filter((item): item is number => typeof item === "number");
    return { store: { items }, changed: items.length !== entries.length, entries: entries.length, kept: items.length };
  },
};

const fallback = (): Store => ({ items: [0] });

describe("loadVersionedStore", () => {
  it("reports empty for missing data", () => {
    expect(loadVersionedStore(undefined, spec)).toEqual({ kind: "empty" });
  });

  it("reports corrupt for invalid json, non-objects and missing versions", () => {
    expect(loadVersionedStore("nope", spec)).toEqual({ kind: "corrupt", raw: "nope" });
    expect(loadVersionedStore("[1]", spec)).toEqual({ kind: "corrupt", raw: "[1]" });
    expect(loadVersionedStore('{"items":[]}', spec)).toEqual({ kind: "corrupt", raw: '{"items":[]}' });
    expect(loadVersionedStore('{"version":0,"items":[]}', spec).kind).toBe("corrupt");
  });

  it("reports corrupt when the parser rejects the shape", () => {
    expect(loadVersionedStore('{"version":2}', spec).kind).toBe("corrupt");
  });

  it("reports corrupt when every entry is invalid", () => {
    const raw = '{"version":2,"items":["a","b"]}';
    expect(loadVersionedStore(raw, spec)).toEqual({ kind: "corrupt", raw });
  });

  it("reports newer versions without parsing", () => {
    expect(loadVersionedStore('{"version":3,"items":"x"}', spec)).toEqual({ kind: "newer", version: 3 });
  });

  it("returns the parsed store, marking older versions as changed", () => {
    expect(loadVersionedStore('{"version":2,"items":[1]}', spec)).toEqual({
      kind: "ok",
      store: { items: [1] },
      changed: false,
      dropped: 0,
    });
    expect(loadVersionedStore('{"version":1,"items":[1]}', spec)).toEqual({
      kind: "ok",
      store: { items: [1] },
      changed: true,
      dropped: 0,
    });
  });

  it("counts dropped entries", () => {
    expect(loadVersionedStore('{"version":2,"items":[1,"x"]}', spec)).toMatchObject({ kind: "ok", dropped: 1 });
  });

  it("keeps an intentionally empty store", () => {
    expect(loadVersionedStore('{"version":2,"items":[]}', spec)).toMatchObject({ kind: "ok", dropped: 0 });
  });
});

describe("planVersionedLoad", () => {
  it("writes nothing for an unchanged store", () => {
    expect(planVersionedLoad('{"version":2,"items":[1]}', spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [1] },
      save: false,
    });
  });

  it("saves a migrated store without a backup when nothing was dropped", () => {
    expect(planVersionedLoad('{"version":1,"items":[1]}', spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [1] },
      save: true,
    });
  });

  it("backs up the raw store and notices when some entries were dropped", () => {
    const raw = '{"version":2,"items":[1,"x"]}';
    expect(planVersionedLoad(raw, spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [1] },
      save: true,
      backup: raw,
      notice: "partial",
    });
  });

  it("treats a store with only invalid entries as corrupt", () => {
    const raw = '{"version":2,"items":["x"]}';
    expect(planVersionedLoad(raw, spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [0] },
      save: true,
      backup: raw,
      notice: "corrupt",
    });
  });

  it("leaves an intentionally empty store alone", () => {
    expect(planVersionedLoad('{"version":2,"items":[]}', spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [] },
      save: false,
    });
  });

  it("saves the fallback for missing data without a notice", () => {
    expect(planVersionedLoad(undefined, spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [0] },
      save: true,
    });
  });

  it("backs up unreadable data and saves the fallback", () => {
    expect(planVersionedLoad("nope", spec, fallback)).toEqual({
      readOnly: false,
      store: { items: [0] },
      save: true,
      backup: "nope",
      notice: "corrupt",
    });
  });

  it("is read-only for a newer version and writes nothing", () => {
    expect(planVersionedLoad('{"version":3,"items":[1]}', spec, fallback)).toEqual({
      readOnly: true,
      notice: "newer",
    });
  });
});

describe("backupKey", () => {
  it("gives each backup its own key", () => {
    const first = backupKey("items.corrupt-backup", new Date("2026-10-21T10:00:00.000Z"));
    const second = backupKey("items.corrupt-backup", new Date("2026-10-21T10:00:01.000Z"));
    expect(first).toBe("items.corrupt-backup.2026-10-21T10:00:00.000Z");
    expect(second).not.toBe(first);
  });
});

describe("isNewerStore", () => {
  it("detects only stores saved with a higher version", () => {
    expect(isNewerStore('{"version":3}', 2)).toBe(true);
    expect(isNewerStore('{"version":2}', 2)).toBe(false);
    expect(isNewerStore("nope", 2)).toBe(false);
    expect(isNewerStore(undefined, 2)).toBe(false);
  });
});
