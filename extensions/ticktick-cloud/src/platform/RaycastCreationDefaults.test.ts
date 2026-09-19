import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

const raycast = vi.hoisted(() => ({
  getPreferenceValues: vi.fn(),
  getSelectedText: vi.fn(),
  readText: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: raycast.getPreferenceValues,
  getSelectedText: raycast.getSelectedText,
  Clipboard: { readText: raycast.readText },
}));

import type { CreateDefaults, CreateFormDefaults, QuickAddDefaults } from "../application/createDefaults";
import { ValidationError } from "../domain/errors";
import {
  createRaycastCreateFormDefaults,
  createRaycastCreationDefaults,
  createRaycastQuickAddDefaults,
  loadRaycastCreationDefaults,
  loadRaycastQuickAddDefaults,
  type RaycastCreationDefaultsPort,
} from "./RaycastCreationDefaults";

const NOW = new Date("2026-08-14T16:23:45.678Z");
const DENVER = "America/Denver";

function adapterPort(overrides: Partial<RaycastCreationDefaultsPort> = {}): RaycastCreationDefaultsPort {
  return {
    readPreferences: vi.fn(() => ({ defaultTitle: "none", defaultDate: "none" })),
    readSelectedText: vi.fn(async () => "selected title"),
    readClipboardText: vi.fn(async () => "clipboard title"),
    now: vi.fn(() => new Date(NOW.getTime())),
    uiTimeZone: vi.fn(() => DENVER),
    ...overrides,
  };
}

async function captureFailure(operation: () => Promise<unknown>): Promise<unknown> {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to fail");
}

beforeEach(() => {
  raycast.getPreferenceValues.mockReset();
  raycast.getSelectedText.mockReset();
  raycast.readText.mockReset();
  raycast.getPreferenceValues.mockReturnValue({ defaultTitle: "none", defaultDate: "none" });
  raycast.getSelectedText.mockResolvedValue("selected title");
  raycast.readText.mockResolvedValue("clipboard title");
});

describe("production Raycast creation defaults", () => {
  it("wires getPreferenceValues and only the selected-text source", async () => {
    raycast.getPreferenceValues.mockReturnValue({ defaultTitle: "selection", defaultDate: "none" });
    raycast.getSelectedText.mockResolvedValue("private selected title");

    const result = await loadRaycastCreationDefaults();

    expect(result).toEqual({ defaultTitle: "private selected title" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(raycast.getPreferenceValues).toHaveBeenCalledOnce();
    expect(raycast.getSelectedText).toHaveBeenCalledOnce();
    expect(raycast.readText).not.toHaveBeenCalled();
  });

  it("wires Clipboard.readText only when clipboard is chosen", async () => {
    raycast.getPreferenceValues.mockReturnValue({ defaultTitle: "clipboard", defaultDate: "none" });
    raycast.readText.mockResolvedValue("private clipboard title");

    const result = await loadRaycastCreationDefaults();

    expect(result).toEqual({ defaultTitle: "private clipboard title" });
    expect(raycast.getPreferenceValues).toHaveBeenCalledOnce();
    expect(raycast.readText).toHaveBeenCalledOnce();
    expect(raycast.getSelectedText).not.toHaveBeenCalled();
  });

  it("treats a getPreferenceValues failure as unavailable preferences without reading private sources", async () => {
    const privateMarker = "private Raycast preference failure";
    raycast.getPreferenceValues.mockImplementation(() => {
      throw new Error(privateMarker);
    });

    const result = await loadRaycastCreationDefaults();

    expect(result).toEqual({});
    expect(Object.isFrozen(result)).toBe(true);
    expect(raycast.getPreferenceValues).toHaveBeenCalledOnce();
    expect(raycast.getSelectedText).not.toHaveBeenCalled();
    expect(raycast.readText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });
});

describe("createRaycastCreationDefaults", () => {
  it("cannot substitute an untrusted resolver through extra runtime arguments", async () => {
    const port = adapterPort({
      readPreferences: vi.fn(() => ({ defaultTitle: "selection", defaultDate: "none" })),
      readSelectedText: vi.fn(async () => "selected title"),
    });
    const bypass = vi.fn(async () => Object.freeze({ defaultTitle: "private bypass output" }));
    const callWithExtraArgument = createRaycastCreationDefaults as unknown as (
      source: RaycastCreationDefaultsPort,
      untrustedResolver: typeof bypass
    ) => () => Promise<CreateDefaults>;

    const result = await callWithExtraArgument(port, bypass)();

    expect(result).toEqual({ defaultTitle: "selected title" });
    expect(bypass).not.toHaveBeenCalled();
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.readSelectedText).toHaveBeenCalledOnce();
  });

  it("calls the preference source and accepted core path exactly once", async () => {
    const preferences = Object.freeze({ defaultTitle: "selection", defaultDate: "none" });
    const port = adapterPort({
      readPreferences: vi.fn(() => preferences),
      readSelectedText: vi.fn(async () => "selected title"),
    });
    const load = createRaycastCreationDefaults(port);

    const result = await load();

    expect(result).toEqual({ defaultTitle: "selected title" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.readSelectedText).toHaveBeenCalledOnce();
    expect(port.now).not.toHaveBeenCalled();
    expect(port.uiTimeZone).not.toHaveBeenCalled();
    expect(port.readClipboardText).not.toHaveBeenCalled();
    expect(Object.isFrozen(load)).toBe(true);
  });

  it("awaits an asynchronously resolved preference snapshot exactly once", async () => {
    const readPreferences = vi.fn(async () => ({ defaultTitle: "clipboard", defaultDate: "none" }));
    const port = adapterPort({
      readPreferences,
      readClipboardText: vi.fn(async () => "clipboard title"),
    });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({ defaultTitle: "clipboard title" });
    expect(readPreferences).toHaveBeenCalledOnce();
    expect(port.readClipboardText).toHaveBeenCalledOnce();
    expect(port.readSelectedText).not.toHaveBeenCalled();
  });

  it("treats an asynchronously rejected preference snapshot as unavailable without retry", async () => {
    const privateMarker = "private async preference failure";
    const readPreferences = vi.fn().mockRejectedValue(new Error(privateMarker));
    const port = adapterPort({ readPreferences });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({});
    expect(readPreferences).toHaveBeenCalledOnce();
    expect(port.readSelectedText).not.toHaveBeenCalled();
    expect(port.readClipboardText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it("treats a hostile preference thenable as unavailable after one assimilation attempt", async () => {
    const privateMarker = "private thenable getter";
    let thenReads = 0;
    const hostileThenable = Object.defineProperty({}, "then", {
      get() {
        thenReads += 1;
        throw new Error(privateMarker);
      },
    });
    const readPreferences = vi.fn(() => hostileThenable);
    const port = adapterPort({ readPreferences });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({});
    expect(readPreferences).toHaveBeenCalledOnce();
    expect(thenReads).toBe(1);
    expect(port.readSelectedText).not.toHaveBeenCalled();
    expect(port.readClipboardText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it("does not access now or timezone when the core date preference is none", async () => {
    const reads: PropertyKey[] = [];
    const port = new Proxy(
      adapterPort({
        readPreferences: vi.fn(() => ({ defaultTitle: "selection", defaultDate: "none" })),
        readSelectedText: vi.fn(async () => "selected title"),
      }),
      {
        get(target, property, receiver) {
          reads.push(property);
          if (property === "now" || property === "uiTimeZone") throw new Error(`private ${String(property)}`);
          return Reflect.get(target, property, receiver);
        },
      }
    );

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({ defaultTitle: "selected title" });
    expect(reads).toEqual(["readPreferences", "readSelectedText"]);
  });

  it("snapshots now and timezone exactly once only when a date is requested", async () => {
    const getterReads = { now: 0, uiTimeZone: 0 };
    const callReads = { now: 0, uiTimeZone: 0 };
    const base = adapterPort({
      readPreferences: vi.fn(() => ({ defaultTitle: "none", defaultDate: "tomorrow" })),
    });
    Object.defineProperty(base, "now", {
      get() {
        getterReads.now += 1;
        return () => {
          callReads.now += 1;
          return new Date(NOW.getTime());
        };
      },
    });
    Object.defineProperty(base, "uiTimeZone", {
      get() {
        getterReads.uiTimeZone += 1;
        return () => {
          callReads.uiTimeZone += 1;
          return DENVER;
        };
      },
    });

    const result = await createRaycastCreationDefaults(base)();

    expect(result.defaultDate?.toISOString()).toBe("2026-08-15T15:00:00.000Z");
    expect(getterReads).toEqual({ now: 1, uiTimeZone: 1 });
    expect(callReads).toEqual({ now: 1, uiTimeZone: 1 });
    expect(Object.isFrozen(result.defaultDate)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("uses only the chosen source and never falls back when that source rejects", async () => {
    const privateMarker = "private selection failure";
    const readSelectedText = vi.fn().mockRejectedValue(new Error(privateMarker));
    const readClipboardText = vi.fn(async () => "private clipboard fallback");
    const port = adapterPort({
      readPreferences: vi.fn(() => ({ defaultTitle: "selection", defaultDate: "none" })),
      readSelectedText,
      readClipboardText,
    });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({});
    expect(readSelectedText).toHaveBeenCalledOnce();
    expect(readClipboardText).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it.each([undefined, null, 42, false, { toString: () => "private coercion" }])(
    "forwards a non-string chosen source without coercion or fallback (%o)",
    async (selectedValue) => {
      const readClipboardText = vi.fn(async () => "private clipboard fallback");
      const port = adapterPort({
        readPreferences: vi.fn(() => ({ defaultTitle: "selection", defaultDate: "none" })),
        readSelectedText: vi.fn(async () => selectedValue),
        readClipboardText,
      });

      const result = await createRaycastCreationDefaults(port)();

      expect(result).toEqual({});
      expect(readClipboardText).not.toHaveBeenCalled();
    }
  );

  it("reads hostile preference and title-source function getters once and fails safely", async () => {
    const privateMarker = "private source getter";
    const port = adapterPort();
    let preferenceGetterReads = 0;
    let sourceGetterReads = 0;
    Object.defineProperty(port, "readPreferences", {
      configurable: true,
      get() {
        preferenceGetterReads += 1;
        return () => ({ defaultTitle: "selection", defaultDate: "none" });
      },
    });
    Object.defineProperty(port, "readSelectedText", {
      configurable: true,
      get() {
        sourceGetterReads += 1;
        throw new Error(privateMarker);
      },
    });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({});
    expect(preferenceGetterReads).toBe(1);
    expect(sourceGetterReads).toBe(1);
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it("treats a hostile preference function getter as unavailable without touching any other port", async () => {
    const privateMarker = "private preference getter";
    const reads: PropertyKey[] = [];
    const port = new Proxy(adapterPort(), {
      get(target, property, receiver) {
        reads.push(property);
        if (property === "readPreferences") throw new Error(privateMarker);
        return Reflect.get(target, property, receiver);
      },
    });

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({});
    expect(reads).toEqual(["readPreferences"]);
    expect(JSON.stringify(result)).not.toContain(privateMarker);
  });

  it.each(["now", "uiTimeZone"] as const)(
    "converts a hostile %s function getter into the core fixed ValidationError",
    async (hostileProperty) => {
      const privateMarker = `private ${hostileProperty} getter`;
      const port = adapterPort({
        readPreferences: vi.fn(() => ({ defaultTitle: "none", defaultDate: "today" })),
      });
      let reads = 0;
      Object.defineProperty(port, hostileProperty, {
        configurable: true,
        get() {
          reads += 1;
          throw new Error(privateMarker);
        },
      });

      const failure = await captureFailure(() => createRaycastCreationDefaults(port)());

      expect(failure).toBeInstanceOf(ValidationError);
      expect(failure).toMatchObject({
        message: "Task creation date defaults are unavailable.",
        code: "validation",
        retryable: false,
      });
      expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(String(failure)).not.toContain(privateMarker);
      expect(reads).toBe(1);
    }
  );

  it("converts invalid requested date values into the core fixed cause-free ValidationError", async () => {
    const privateMarker = "private/not-a-zone";
    const port = adapterPort({
      readPreferences: vi.fn(() => ({ defaultTitle: "none", defaultDate: "today" })),
      now: vi.fn(() => new Date(Number.NaN)),
      uiTimeZone: vi.fn(() => privateMarker),
    });

    const failure = await captureFailure(() => createRaycastCreationDefaults(port)());

    expect(failure).toBeInstanceOf(ValidationError);
    expect(failure).toMatchObject({ message: "Task creation date defaults are unavailable." });
    expect((failure as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(String(failure)).not.toContain(privateMarker);
    expect(port.now).toHaveBeenCalledOnce();
    expect(port.uiTimeZone).toHaveBeenCalledOnce();
  });

  it("does not mutate preferences, the injected Date, or the port", async () => {
    const preferences = { defaultTitle: "clipboard", defaultDate: "tomorrow", nested: { private: true } };
    const now = new Date(NOW.getTime());
    const port = adapterPort({
      readPreferences: vi.fn(() => preferences),
      readClipboardText: vi.fn(async () => "clipboard title"),
      now: vi.fn(() => now),
    });
    const beforeKeys = Reflect.ownKeys(port);

    const result = await createRaycastCreationDefaults(port)();

    expect(result).toEqual({
      defaultTitle: "clipboard title",
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.defaultDate)).toBe(true);
    expect(preferences).toEqual({ defaultTitle: "clipboard", defaultDate: "tomorrow", nested: { private: true } });
    expect(Object.isFrozen(preferences)).toBe(false);
    expect(Object.isFrozen(preferences.nested)).toBe(false);
    expect(now.toISOString()).toBe(NOW.toISOString());
    expect(Object.isFrozen(now)).toBe(false);
    expect(Reflect.ownKeys(port)).toEqual(beforeKeys);
  });

  it("allowlists imports and excludes storage, backend, legacy, network, logging, and scheduler access", () => {
    const source = readFileSync(resolve(__dirname, "RaycastCreationDefaults.ts"), "utf8");
    const sourceFile = ts.createSourceFile(
      "RaycastCreationDefaults.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const imports = sourceFile.statements
      .filter(ts.isImportDeclaration)
      .map((declaration) => declaration.moduleSpecifier)
      .filter(ts.isStringLiteral)
      .map((moduleSpecifier) => moduleSpecifier.text);

    expect(imports).toEqual(["@raycast/api", "../application/createDefaults"]);
    expect(source).not.toMatch(/\b(?:require|import)\s*\(/);
    expect(source).not.toMatch(/localstorage|service\/|infrastructure\/|run-applescript|osscript|backend/i);
    expect(source).not.toMatch(/\b(?:fetch|websocket|xmlhttprequest|eventsource|sendbeacon)\b/i);
    expect(source).not.toMatch(/\bconsole\s*\.|\b(?:pino|winston|log4js)\b/i);
    expect(source).not.toMatch(/\b(?:settimeout|setinterval|setimmediate|queuemicrotask|requestanimationframe)\b/i);
  });
});

describe("lazy dependency contract", () => {
  it("passes dependency methods that retain port receiver semantics", async () => {
    const port = adapterPort() as RaycastCreationDefaultsPort & { receiverMarker?: string };
    port.receiverMarker = "receiver-title";
    port.readPreferences = vi.fn(function (this: typeof port) {
      expect(this).toBe(port);
      return { defaultTitle: "selection", defaultDate: "none" };
    });
    port.readSelectedText = vi.fn(function (this: typeof port) {
      expect(this).toBe(port);
      return Promise.resolve(this.receiverMarker);
    });

    await expect(createRaycastCreationDefaults(port)()).resolves.toEqual({ defaultTitle: "receiver-title" });
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.readSelectedText).toHaveBeenCalledOnce();
  });
});

describe("createRaycastCreateFormDefaults", () => {
  it("loads a validated form timezone once even without a configured date or private title source", async () => {
    const port = adapterPort();

    const result = await createRaycastCreateFormDefaults(port)();

    expect(result).toEqual({ uiTimeZone: DENVER } satisfies CreateFormDefaults);
    expect(Object.isFrozen(result)).toBe(true);
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.uiTimeZone).toHaveBeenCalledOnce();
    expect(port.now).not.toHaveBeenCalled();
    expect(port.readSelectedText).not.toHaveBeenCalled();
    expect(port.readClipboardText).not.toHaveBeenCalled();
  });

  it("exports a production loader without performing Raycast reads at module initialization", async () => {
    vi.resetModules();

    const isolatedModule = await import("./RaycastCreationDefaults");

    expect(isolatedModule.loadRaycastCreateFormDefaults).toBeTypeOf("function");
    expect(raycast.getPreferenceValues).not.toHaveBeenCalled();
    expect(raycast.getSelectedText).not.toHaveBeenCalled();
    expect(raycast.readText).not.toHaveBeenCalled();

    const result = await isolatedModule.loadRaycastCreateFormDefaults();

    expect(result.uiTimeZone).toBeTypeOf("string");
    expect(result.uiTimeZone.length).toBeGreaterThan(0);
    expect(raycast.getPreferenceValues).toHaveBeenCalledOnce();
  });
});

describe("createRaycastQuickAddDefaults", () => {
  it("reads only the date preference and never accesses selection or clipboard methods", async () => {
    let defaultTitleReads = 0;
    const preferences = {
      get defaultTitle() {
        defaultTitleReads += 1;
        throw new Error("private default title");
      },
      defaultDate: "tomorrow",
    };
    const port = adapterPort({ readPreferences: vi.fn(() => preferences) });
    Object.defineProperty(port, "readSelectedText", {
      configurable: true,
      get() {
        throw new Error("selection method must stay unread");
      },
    });
    Object.defineProperty(port, "readClipboardText", {
      configurable: true,
      get() {
        throw new Error("clipboard method must stay unread");
      },
    });

    const result = await createRaycastQuickAddDefaults(port)();

    expect(result).toEqual({
      defaultDate: new Date("2026-08-15T15:00:00.000Z"),
      uiTimeZone: DENVER,
    } satisfies QuickAddDefaults);
    expect(defaultTitleReads).toBe(0);
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.now).toHaveBeenCalledOnce();
    expect(port.uiTimeZone).toHaveBeenCalledOnce();
  });

  it("does not read time, timezone, selection, or clipboard when the date preference is absent", async () => {
    const port = adapterPort();

    const result = await createRaycastQuickAddDefaults(port)();

    expect(result).toEqual({});
    expect(Object.isFrozen(result)).toBe(true);
    expect(port.readPreferences).toHaveBeenCalledOnce();
    expect(port.now).not.toHaveBeenCalled();
    expect(port.uiTimeZone).not.toHaveBeenCalled();
    expect(port.readSelectedText).not.toHaveBeenCalled();
    expect(port.readClipboardText).not.toHaveBeenCalled();
  });

  it("exports a production date-only loader that performs no private or ambient reads when no date is configured", async () => {
    expect(loadRaycastQuickAddDefaults).toBeTypeOf("function");
    expect(raycast.getPreferenceValues).not.toHaveBeenCalled();

    await expect(loadRaycastQuickAddDefaults()).resolves.toEqual({});
    expect(raycast.getPreferenceValues).toHaveBeenCalledOnce();
    expect(raycast.getSelectedText).not.toHaveBeenCalled();
    expect(raycast.readText).not.toHaveBeenCalled();
  });
});
