import { describe, expect, it } from "vitest";
import { SavedStore } from "../../src/icons/memory-store";

interface Value {
  uses: Record<string, number>;
  saved: Record<string, string[]>;
}

const empty = (): Value => ({ uses: {}, saved: {} });

function makeStore(fail = new Set<keyof Value>()) {
  const writes: [keyof Value, unknown][] = [];
  const changes: Value[] = [];
  const store = new SavedStore<Value>(
    empty(),
    async (field, value) => {
      if (fail.has(field)) throw new Error("disk full");
      writes.push([field, value]);
    },
    (value) => changes.push(value),
  );
  return { store, writes, changes };
}

describe("SavedStore", () => {
  it("builds each update on the latest value, so a view opened earlier can't overwrite a newer save", async () => {
    const { store } = makeStore();
    // Two handlers captured at the same moment, as a pushed preview's are.
    const editKeywords = store.update("saved", (saved) => ({ ...saved, savings: ["piggy bank"] }));
    const copyFromAi = store.update("saved", (saved) => ({
      ...saved,
      savings: [...(saved.savings ?? []), "save money"],
    }));
    await Promise.all([editKeywords, copyFromAi]);
    expect(store.current.saved).toEqual({ savings: ["piggy bank", "save money"] });
  });

  it("changes nothing and rejects when the write fails", async () => {
    const { store, changes } = makeStore(new Set(["saved"]));
    await expect(store.update("saved", () => ({ star: ["favorite"] }))).rejects.toThrow("disk full");
    expect(store.current.saved).toEqual({});
    expect(changes).toEqual([]);
  });

  it("keeps working after a failed write", async () => {
    const fail = new Set<keyof Value>(["saved"]);
    const { store } = makeStore(fail);
    await store.update("saved", () => ({ star: ["a"] })).catch(() => undefined);
    fail.clear();
    await expect(store.update("saved", () => ({ star: ["b"] }))).resolves.toBe(true);
    expect(store.current.saved).toEqual({ star: ["b"] });
  });

  it("writes and reports nothing when the update changes nothing", async () => {
    const { store, writes, changes } = makeStore();
    await expect(store.update("saved", (saved) => saved)).resolves.toBe(false);
    expect(writes).toEqual([]);
    expect(changes).toEqual([]);
  });

  it("applies updates made before loading finished on top of the loaded value", async () => {
    const { store } = makeStore();
    let finish: (value: Value) => void = () => undefined;
    store.load(new Promise<Value>((resolve) => (finish = resolve)));
    const counting = store.update("uses", (uses) => ({ ...uses, star: (uses.star ?? 0) + 1 }));
    finish({ uses: { star: 4 }, saved: {} });
    await counting;
    expect(store.current.uses).toEqual({ star: 5 });
  });

  it("reports the loaded value once it arrives", async () => {
    const { store, changes } = makeStore();
    await store.load(Promise.resolve({ uses: { star: 1 }, saved: {} }));
    expect(changes).toEqual([{ uses: { star: 1 }, saved: {} }]);
  });
});
