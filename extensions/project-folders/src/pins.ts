import { LocalStorage } from "@raycast/api";

const PINS_KEY = "pinned-v1";

export async function getPins(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINS_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

// Serialise writes within the command so pruning cannot overwrite a concurrent toggle.
let pendingMutation: Promise<unknown> = Promise.resolve();

function updatePins(update: (pins: string[]) => string[]): Promise<string[]> {
  const mutation = pendingMutation.then(async () => {
    const pins = await getPins();
    const next = update(pins);
    if (JSON.stringify(next) !== JSON.stringify(pins)) {
      await LocalStorage.setItem(PINS_KEY, JSON.stringify(next));
    }
    return next;
  });
  pendingMutation = mutation.catch(() => {});
  return mutation;
}

export function togglePin(projectPath: string): Promise<string[]> {
  return updatePins((pins) =>
    pins.includes(projectPath) ? pins.filter((p) => p !== projectPath) : [projectPath, ...pins],
  );
}

export function prunePins(existingPaths: Set<string>): Promise<string[]> {
  return updatePins((pins) => pins.filter((p) => existingPaths.has(p)));
}
