import { LocalStorage } from "@raycast/api";

export interface Transition {
  kind: "connect" | "disconnect";
  countryCode?: string;
  startedAt: number;
}

const KEY = "transition";
const STALE_MS = 150000;

export async function setTransition(
  transition: Omit<Transition, "startedAt">,
): Promise<void> {
  await LocalStorage.setItem(
    KEY,
    JSON.stringify({ ...transition, startedAt: Date.now() }),
  );
}

export async function clearTransition(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

export async function getTransition(): Promise<Transition | undefined> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return undefined;
  try {
    const transition = JSON.parse(raw) as Transition;
    if (Date.now() - transition.startedAt > STALE_MS) {
      await clearTransition();
      return undefined;
    }
    return transition;
  } catch {
    await clearTransition();
    return undefined;
  }
}
