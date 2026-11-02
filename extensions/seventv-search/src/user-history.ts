import type { EmoteStorage } from "./saved-emotes";
import type { SevenTVUser, UserEmoteMode } from "./user-emotes";

export function createUserHistoryStore(
  storage: EmoteStorage,
  mode: UserEmoteMode,
) {
  const key = `recent_users_${mode}_v1`;
  let state: SevenTVUser[] = [];
  let loading: Promise<void> | undefined;
  let pending = Promise.resolve();
  async function load() {
    loading ??= (async () => {
      const saved = await storage.getItem(key);
      if (saved === undefined) return;
      const parsed: unknown = JSON.parse(saved);
      if (
        !Array.isArray(parsed) ||
        parsed.some(
          (user) =>
            !user ||
            typeof user.id !== "string" ||
            typeof user.name !== "string" ||
            typeof user.handle !== "string" ||
            typeof user.platform !== "string" ||
            (user.avatar !== undefined && typeof user.avatar !== "string"),
        )
      ) {
        throw new Error("Saved users could not be read");
      }
      state = parsed.slice(0, 20);
    })();
    await loading;
    return [...state];
  }
  function update(change: (users: SevenTVUser[]) => SevenTVUser[]) {
    const operation = pending.then(async () => {
      await load();
      const next = change(state).slice(0, 20);
      await storage.setItem(key, JSON.stringify(next));
      state = next;
      return [...state];
    });
    pending = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
  return {
    load,
    record: (user: SevenTVUser) =>
      update((users) => [
        user,
        ...users.filter((saved) => saved.id !== user.id),
      ]),
    remove: (id: string) =>
      update((users) => users.filter((user) => user.id !== id)),
    clear: () => update(() => []),
  };
}
