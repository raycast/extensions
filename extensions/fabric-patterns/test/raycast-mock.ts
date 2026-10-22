// The one stand-in for @raycast/api and @raycast/utils. bun test runs every file in one process
// and module mocks are process-wide, so two files mocking @raycast/api with different shapes
// break whichever loads second ("Export named 'Action' not found"). Every test that needs
// Raycast imports this module and drives the shared `fake` state.
import { mock } from "bun:test";
import { copyFileSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ReactElement } from "react";
import { hooks, stub } from "./render-harness";

/** A toast as showToast received it; the one shape every test reads. */
type Toasted = { style?: string; title?: string; message?: string; primaryAction?: { title: string; onAction?: (t: unknown) => void } };

export const tmp = realpathSync(mkdtempSync(join(tmpdir(), "fabric-raycast-")));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
// environment.assetsPath is tmp: the real background wrapper sits there, as it does in the built extension.
copyFileSync(join(import.meta.dir, "..", "assets", "fabric-bg.sh"), join(tmp, "fabric-bg.sh"));

/** Every knob's starting value; resetFake restores exactly this, so a new knob can't leak between tests. */
const initial = () => ({
  prefs: {} as Record<string, string | undefined>,
  failWrites: false,
  selected: "",
  clipboard: undefined as string | undefined,
  copied: [] as string[],
  /** What Clipboard.paste was handed. */
  pasted: [] as string[],
  failCopy: false,
  toasts: [] as Toasted[],
  /** Each toast as showToast received it, before any setter ran. */
  shown: [] as Toasted[],
  /** Toasts whose hide() ran. */
  hidden: [] as Toasted[],
  /** How many times openExtensionPreferences ran. */
  prefsOpened: 0,
  /** What showHUD was handed. */
  huds: [] as string[],
  nav: { pushed: [] as ReactElement[], pops: 0 },
  /** What @raycast/utils usePromise hands back as `data`. */
  promiseData: undefined as unknown,
  /** When set, revalidate() hands it over as `data` a tick later, the order a real re-list lands in. */
  relist: undefined as unknown,
  /** What confirmAlert answers. */
  confirm: true,
  /** LocalStorage.getItem rejects. */
  failReads: false,
});

export const fake = { kv: new Map<string, string>(), ...initial() };

export function resetFake() {
  Object.assign(fake, initial());
  fake.kv.clear();
}

mock.module("@raycast/api", () => ({
  Action: stub("Action"),
  ActionPanel: stub("ActionPanel"),
  Detail: stub("Detail"),
  Form: stub("Form"),
  List: stub("List"),
  Icon: stub("Icon"),
  Color: stub("Color"),
  Keyboard: stub("Keyboard"),
  Alert: stub("Alert"),
  Toast: { Style: { Success: "success", Failure: "failure", Animated: "animated" } },
  environment: { supportPath: tmp, assetsPath: tmp },
  getPreferenceValues: () => ({ ...fake.prefs }),
  LocalStorage: {
    getItem: async (k: string) => {
      if (fake.failReads) throw new Error("LocalStorage read failed");
      return fake.kv.get(k);
    },
    setItem: async (k: string, v: string) => {
      if (fake.failWrites) throw new Error("LocalStorage write failed");
      fake.kv.set(k, v);
    },
  },
  useNavigation: () => ({
    push: (el: ReactElement) => fake.nav.pushed.push(el),
    pop: () => fake.nav.pops++,
  }),
  // Hands back the recorded toast, so a later `toast.style = …` on the handle shows in fake.toasts.
  showToast: async (t: Toasted) => {
    fake.toasts.push(t);
    fake.shown.push({ ...t });
    // Not enumerable, so toEqual on fake.toasts ignores it; configurable, because a shared constant
    // (result.tsx STOPPING) reaches showToast more than once and gets it defined again.
    Object.defineProperty(t, "hide", { value: async () => void fake.hidden.push(t), configurable: true });
    return t;
  },
  showHUD: async (m: string) => void fake.huds.push(m),
  confirmAlert: async () => fake.confirm,
  // Counts once the call settles, so a caller that doesn't await it reads 0.
  openExtensionPreferences: async () => {
    await Bun.sleep(5);
    fake.prefsOpened++;
  },
  closeMainWindow: async () => {},
  Clipboard: {
    copy: async (t: string) => {
      if (fake.failCopy) throw new Error("clipboard unavailable");
      fake.copied.push(t);
    },
    paste: async (t: string) => void fake.pasted.push(t),
    readText: async () => fake.clipboard,
  },
  getFrontmostApplication: async () => ({ name: "TextEdit", bundleId: "com.apple.TextEdit" }),
  getSelectedFinderItems: async () => [],
  getSelectedText: async () => fake.selected,
}));

mock.module("@raycast/utils", () => ({
  usePromise: () => {
    const [, rerender] = hooks.useState(0);
    const revalidate = () => {
      if (fake.relist === undefined) return;
      const next = fake.relist;
      fake.relist = undefined;
      setTimeout(() => {
        fake.promiseData = next;
        rerender((n) => n + 1);
      }, 5);
    };
    return { data: fake.promiseData, isLoading: false, error: undefined, revalidate };
  },
}));
