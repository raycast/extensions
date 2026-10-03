import { createUserDataStore } from "./user-data-store";
import type { UserDataState } from "../user-data/service";
const data = { favorites: [] } as unknown as UserDataState;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
it("clears previous account data while loading replacement credentials", async () => {
  let token: string | null = "A";
  const next = deferred<UserDataState>();
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => value === token,
    load: async (value) => (value === "A" ? data : next.promise),
  });
  await store.revalidate();
  expect(store.getSnapshot().data).toBe(data);
  token = "B";
  const pending = store.revalidate();
  await Promise.resolve();
  expect(store.getSnapshot().data).toBeNull();
  next.resolve(data);
  await pending;
  token = null;
  await store.revalidate();
  expect(store.getSnapshot().data).toBeNull();
});
it("ignores an old request after reset", async () => {
  const next = deferred<UserDataState>();
  const store = createUserDataStore({
    getToken: async () => "A",
    isCurrent: async () => true,
    load: () => next.promise,
  });
  const pending = store.revalidate();
  await Promise.resolve();
  store.reset();
  next.resolve(data);
  await pending;
  expect(store.getSnapshot().data).toBeNull();
});

it("clears private data when the last view closes and reopens signed out", async () => {
  let token: string | null = "A";
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => value === token,
    load: async () => data,
  });
  const closeFirst = store.subscribe(() => {});
  const closeLast = store.subscribe(() => {});
  await store.revalidate();
  closeFirst();
  expect(store.getSnapshot().data).toBe(data);
  token = null;
  closeLast();
  expect(store.getSnapshot().data).toBeNull();
  expect(store.getSnapshot().initialized).toBe(false);
  const closeReopened = store.subscribe(() => {});
  await store.revalidate();
  expect(store.getSnapshot().data).toBeNull();
  expect(store.getSnapshot().initialized).toBe(true);
  closeReopened();
});

it("does not let delayed account validation reset a newer account", async () => {
  let token = "A";
  const current = deferred<boolean>();
  const checked = deferred<void>();
  const replacement = { ...data, favorites: [] };
  const store = createUserDataStore({
    getToken: async () => token,
    isCurrent: async (value) => {
      if (value === "A") {
        checked.resolve();
        return current.promise;
      }
      return true;
    },
    load: async (value) => (value === "A" ? data : replacement),
  });
  const first = store.revalidate();
  await checked.promise;
  store.reset();
  token = "B";
  await store.revalidate();
  current.resolve(false);
  await first;
  expect(store.getSnapshot().data).toBe(replacement);
});
