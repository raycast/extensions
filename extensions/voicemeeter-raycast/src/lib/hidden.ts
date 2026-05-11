import { LocalStorage } from "@raycast/api";
import { VoicemeeterTarget } from "./types";

const HIDDEN_KEY = "vm.hidden.v1";

function targetKey(target: VoicemeeterTarget): string {
  return `${target.kind}:index:${target.index}`;
}

export function isHidden(
  target: VoicemeeterTarget,
  hidden: Set<string>,
): boolean {
  return hidden.has(targetKey(target));
}

export function filterVisible<T extends VoicemeeterTarget>(
  targets: T[],
  hidden: Set<string>,
): T[] {
  return targets.filter((t) => !hidden.has(targetKey(t)));
}

export async function loadHidden(): Promise<Set<string>> {
  const raw = await LocalStorage.getItem<string>(HIDDEN_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export async function saveHidden(hidden: Set<string>): Promise<void> {
  await LocalStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
}

export async function toggleHidden(
  target: VoicemeeterTarget,
): Promise<boolean> {
  const hid = await loadHidden();
  const key = targetKey(target);
  if (hid.has(key)) {
    hid.delete(key);
  } else {
    hid.add(key);
  }
  await saveHidden(hid);
  return hid.has(key);
}
