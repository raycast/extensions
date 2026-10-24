// A minimal hooks runtime for render-level tests: it runs ONE root component, keeps its hook
// state between renders, re-renders on setState and runs effects after each render. Child
// components are left as elements, so a test reads the props the root handed them. Raycast's
// own components are inert stand-ins; tests act by calling the handlers found in the tree.
import { isValidElement, type ReactElement } from "react";

type Effect = { deps?: unknown[]; cleanup?: void | (() => void) };

let current: Root | undefined;

const changed = (a: unknown[] | undefined, b: unknown[] | undefined) =>
  !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));

class Root {
  slots: unknown[] = [];
  i = 0;
  effects: (() => void)[] = [];
  rendering = false;
  dirty = false;
  dead = false;
  tree: unknown;
  constructor(
    private fn: (props: never) => unknown,
    private props: unknown,
  ) {}

  render() {
    if (this.dead) return;
    if (this.rendering) return void (this.dirty = true);
    this.rendering = true;
    try {
      for (let n = 0; n < 25; n++) {
        this.dirty = false;
        this.i = 0;
        // eslint-disable-next-line @typescript-eslint/no-this-alias -- the hooks read the root being rendered
        current = this;
        try {
          this.tree = this.fn(this.props as never);
        } finally {
          current = undefined;
        }
        for (const fx of this.effects.splice(0)) fx();
        if (!this.dirty) return;
      }
      throw new Error("render loop: state kept changing");
    } finally {
      this.rendering = false;
    }
  }

  unmount() {
    // A state update that lands afterwards (a promise the view started) no longer re-renders it.
    this.dead = true;
    for (const s of this.slots) {
      const c = (s as Effect | undefined)?.cleanup;
      if (typeof c === "function") c();
    }
  }
}

const root = () => {
  if (!current) throw new Error("a hook ran outside the harness render");
  return current;
};

export const hooks = {
  useState<T>(init: T | (() => T)) {
    const r = root();
    const k = r.i++;
    if (!(k in r.slots)) r.slots[k] = typeof init === "function" ? (init as () => T)() : init;
    const set = (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(r.slots[k] as T) : v;
      if (Object.is(next, r.slots[k])) return;
      r.slots[k] = next;
      r.render();
    };
    return [r.slots[k] as T, set] as const;
  },
  useMemo<T>(fn: () => T, deps?: unknown[]) {
    const r = root();
    const k = r.i++;
    const prev = r.slots[k] as { deps?: unknown[]; value: T } | undefined;
    if (!prev || changed(prev.deps, deps)) r.slots[k] = { deps, value: fn() };
    return (r.slots[k] as { value: T }).value;
  },
  useRef<T>(init: T) {
    const r = root();
    const k = r.i++;
    if (!(k in r.slots)) r.slots[k] = { current: init };
    return r.slots[k] as { current: T };
  },
  // Only the hooks the rendered roots use. A root needing another fails loudly ("not a function"),
  // and that hook gets added with the test that proves it.
  useEffect(fn: () => void | (() => void), deps?: unknown[]) {
    const r = root();
    const k = r.i++;
    const prev = r.slots[k] as Effect | undefined;
    if (prev && !changed(prev.deps, deps)) return;
    const slot: Effect = { deps };
    r.slots[k] = slot;
    r.effects.push(() => {
      if (typeof prev?.cleanup === "function") prev.cleanup();
      slot.cleanup = fn();
    });
  },
};

export function render<P>(fn: (props: P) => unknown, props: P) {
  const r = new Root(fn as never, props);
  r.render();
  return {
    get tree() {
      return r.tree;
    },
    unmount: () => r.unmount(),
  };
}

/** Every element in a tree, depth first, including those held in props (detail, actions, metadata). */
export function elements(node: unknown, out: ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) for (const n of node) elements(n, out);
  else if (isValidElement(node)) {
    const el = node as ReactElement<Record<string, unknown>>;
    out.push(el);
    for (const v of Object.values(el.props)) elements(v, out);
  }
  return out;
}

export const typeName = (el: ReactElement) => {
  const t = el.type as { displayName?: string; name?: string } | string;
  return typeof t === "string" ? t : (t.displayName ?? t.name ?? "?");
};

/** An inert stand-in for a Raycast component namespace: `Detail.Metadata.Label` is a named component too. */
export function stub(name: string): unknown {
  const kids = new Map<PropertyKey, unknown>();
  const f = () => null;
  return new Proxy(f, {
    get(t, p) {
      if (p === "displayName") return name;
      if (typeof p === "symbol" || p in Function.prototype || p === "prototype" || p === "defaultProps")
        return Reflect.get(t, p);
      if (!kids.has(p)) kids.set(p, stub(`${name}.${String(p)}`));
      return kids.get(p);
    },
  });
}

/** Lets pending promise callbacks (and the re-renders they trigger) run. */
export async function settle(times = 20) {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 5));
}

/** Ticks until `cond` holds or about 1 s passes; the caller's next expect reports a timeout. */
export async function until(cond: () => unknown, ticks = 200) {
  for (let i = 0; i < ticks && !cond(); i++) await settle(1);
}
