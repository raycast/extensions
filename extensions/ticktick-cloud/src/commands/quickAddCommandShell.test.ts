import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as ts from "typescript";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type {
  CommandRuntimeBootstrap,
  ReadyCommandRuntime,
  ReadyCommandRuntimeInput,
} from "../application/commandRuntime";
import { AmbiguousMutationError, ProtocolError } from "../domain/errors";
import type { QuickAddCommandEffects, QuickAddCommandInput, QuickAddCommandToast } from "./executeQuickAddCommand";
import type { QuickAddCommandRuntimePorts } from "./quickAddCommandRuntime";

const boundary = vi.hoisted(() => ({
  createReadyCommandRuntime: vi.fn(),
  executeQuickAddFromRuntime: vi.fn(),
  presentQuickAddCommandFailure: vi.fn(),
}));

vi.mock("../application/commandRuntime", () => ({
  createReadyCommandRuntime: boundary.createReadyCommandRuntime,
}));
vi.mock("./quickAddCommandRuntime", () => ({
  executeQuickAddFromRuntime: boundary.executeQuickAddFromRuntime,
}));
vi.mock("./executeQuickAddCommand", () => ({
  presentQuickAddCommandFailure: boundary.presentQuickAddCommandFailure,
}));

import { executeQuickAddCommandShell, type QuickAddCommandShellDependencies } from "./quickAddCommandShell";

type StaticImportDeclaration = Readonly<{ moduleSpecifier: string; declaration: string }>;

const SAFE_FAILURE_TOAST: QuickAddCommandToast = Object.freeze({
  style: "failure",
  title: "Task Could Not Be Added",
  message: "TickTick couldn't complete the request.",
});
const readyRuntime = Object.freeze({ kind: "ready" }) as ReadyCommandRuntime;
const bootstrapInput = Object.freeze({ private: "bootstrap input" }) as unknown as ReadyCommandRuntimeInput;

function effects(
  showToast: QuickAddCommandEffects["showToast"] = vi.fn(async () => undefined)
): QuickAddCommandEffects {
  return Object.freeze({
    showToast,
    closeMainWindow: vi.fn(async () => undefined),
  });
}

function ports(commandEffects: QuickAddCommandEffects = effects()): QuickAddCommandRuntimePorts {
  return Object.freeze({
    preferences: Object.freeze({
      load: vi.fn(async () => undefined),
      remember: vi.fn(async () => undefined),
    }),
    loadDefaults: vi.fn(async () => Object.freeze({ uiTimeZone: "America/Denver" })),
    effects: commandEffects,
  });
}

function dependencies(
  bootstrap: CommandRuntimeBootstrap,
  commandPorts: QuickAddCommandRuntimePorts = ports()
): QuickAddCommandShellDependencies {
  return Object.freeze({ bootstrap, ports: commandPorts });
}

function staticImportDeclarations(source: string): readonly StaticImportDeclaration[] {
  const diagnostics = ts.transpileModule(source, {
    fileName: "quickAddCommandShell-import-audit.ts",
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.Latest },
  }).diagnostics;
  if (diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
    throw new Error("Quick Add shell import audit source is invalid.");
  }

  const sourceFile = ts.createSourceFile(
    "quickAddCommandShell-import-audit.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  return sourceFile.statements.flatMap((statement) => {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      return [{ moduleSpecifier: statement.moduleSpecifier.text, declaration: statement.getText(sourceFile) }];
    }
    if (!ts.isImportEqualsDeclaration(statement)) return [];
    if (
      !ts.isExternalModuleReference(statement.moduleReference) ||
      !ts.isStringLiteral(statement.moduleReference.expression)
    ) {
      throw new Error("Quick Add shell import audit found an unsupported import-equals declaration.");
    }

    return [{ moduleSpecifier: statement.moduleReference.expression.text, declaration: statement.getText(sourceFile) }];
  });
}

beforeEach(() => {
  boundary.createReadyCommandRuntime.mockReset();
  boundary.executeQuickAddFromRuntime.mockReset();
  boundary.presentQuickAddCommandFailure.mockReset();
  boundary.createReadyCommandRuntime.mockReturnValue(readyRuntime);
  boundary.executeQuickAddFromRuntime.mockResolvedValue(undefined);
  boundary.presentQuickAddCommandFailure.mockReturnValue(SAFE_FAILURE_TOAST);
});

describe("executeQuickAddCommandShell", () => {
  it("exports the exact readonly injected shell API", () => {
    expectTypeOf<QuickAddCommandShellDependencies>().toEqualTypeOf<
      Readonly<{
        bootstrap: CommandRuntimeBootstrap;
        ports: QuickAddCommandRuntimePorts;
      }>
    >();
    expectTypeOf(executeQuickAddCommandShell).parameter(0).toEqualTypeOf<QuickAddCommandShellDependencies>();
    expectTypeOf(executeQuickAddCommandShell).parameter(1).toEqualTypeOf<QuickAddCommandInput>();
    expectTypeOf(executeQuickAddCommandShell).returns.toEqualTypeOf<Promise<void>>();
  });

  it("awaits bootstrap, materializes once, then delegates once in order with exact identities", async () => {
    const events: string[] = [];
    const commandPorts = ports();
    const input = Object.freeze({ text: "private input" });
    const dependencyReceiver = {};
    const bootstrap: CommandRuntimeBootstrap = function (this: QuickAddCommandShellDependencies) {
      expect(this).toBe(dependencyReceiver);
      events.push("bootstrap");
      return Promise.resolve(bootstrapInput).then((value) => {
        events.push("bootstrap:resolved");
        return value;
      });
    };
    const deps = Object.freeze(Object.assign(dependencyReceiver, { bootstrap, ports: commandPorts }));
    boundary.createReadyCommandRuntime.mockImplementation((received) => {
      events.push("materialize");
      expect(received).toBe(bootstrapInput);
      return readyRuntime;
    });
    boundary.executeQuickAddFromRuntime.mockImplementation(async (runtime, receivedPorts, receivedInput) => {
      events.push("delegate");
      expect(runtime).toBe(readyRuntime);
      expect(receivedPorts).toBe(commandPorts);
      expect(receivedInput).toBe(input);
    });

    await executeQuickAddCommandShell(deps, input);

    expect(events).toEqual(["bootstrap", "bootstrap:resolved", "materialize", "delegate"]);
    expect(boundary.createReadyCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.executeQuickAddFromRuntime).toHaveBeenCalledOnce();
    expect(boundary.presentQuickAddCommandFailure).not.toHaveBeenCalled();
  });

  it.each(["synchronous", "asynchronous"] as const)(
    "presents one safe best-effort toast for a %s bootstrap failure and returns",
    async (mode) => {
      const privateMarker = `private-${mode}-bootstrap-failure`;
      const failure = new Error(privateMarker);
      const showToast = vi.fn(async () => undefined);
      const commandPorts = ports(effects(showToast));
      const bootstrap = vi.fn(function (this: unknown) {
        if (mode === "synchronous") throw failure;
        return Promise.reject(failure);
      }) as unknown as CommandRuntimeBootstrap;
      const deps = dependencies(bootstrap, commandPorts);

      await expect(executeQuickAddCommandShell(deps, Object.freeze({ text: "private task" }))).resolves.toBeUndefined();

      expect(bootstrap).toHaveBeenCalledOnce();
      expect(boundary.createReadyCommandRuntime).not.toHaveBeenCalled();
      expect(boundary.executeQuickAddFromRuntime).not.toHaveBeenCalled();
      expect(boundary.presentQuickAddCommandFailure).toHaveBeenCalledOnce();
      expect(boundary.presentQuickAddCommandFailure).toHaveBeenCalledWith(failure);
      expect(showToast).toHaveBeenCalledOnce();
      expect(showToast).toHaveBeenCalledWith(SAFE_FAILURE_TOAST);
      expect(JSON.stringify(showToast.mock.calls)).not.toContain(privateMarker);
    }
  );

  it("passes an invalid hostile bootstrap result directly to materialization without inspecting it", async () => {
    const privateMarker = "private-hostile-bootstrap-result";
    const reads: PropertyKey[] = [];
    const hostileResult = Object.defineProperties(
      {},
      Object.fromEntries(
        ["backend", "accountKey", "repository", "onReconnect", "onOpenPreferences"].map((property) => [
          property,
          {
            get() {
              reads.push(property);
              throw new Error(privateMarker);
            },
          },
        ])
      )
    ) as ReadyCommandRuntimeInput;
    const materializationFailure = new ProtocolError("private invalid bootstrap result");
    const showToast = vi.fn(async () => undefined);
    let receivedResult: unknown;
    boundary.createReadyCommandRuntime.mockImplementation((received) => {
      receivedResult = received;
      throw materializationFailure;
    });

    await expect(
      executeQuickAddCommandShell(
        dependencies(
          vi.fn(() => hostileResult),
          ports(effects(showToast))
        ),
        Object.freeze({ text: "private task" })
      )
    ).resolves.toBeUndefined();

    expect(reads).toEqual([]);
    expect(receivedResult === hostileResult).toBe(true);
    expect(boundary.createReadyCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.executeQuickAddFromRuntime).not.toHaveBeenCalled();
    expect(boundary.presentQuickAddCommandFailure).toHaveBeenCalledWith(materializationFailure);
    expect(showToast).toHaveBeenCalledWith(SAFE_FAILURE_TOAST);
    expect(JSON.stringify(showToast.mock.calls)).not.toContain(privateMarker);
  });

  it("passes a hostile bootstrap rejection to the presenter by identity without inspecting or leaking it", async () => {
    const privateMarker = "private-hostile-bootstrap-error";
    const reads: PropertyKey[] = [];
    const hostileFailure = Object.defineProperties(Object.create(null) as object, {
      message: {
        get() {
          reads.push("message");
          throw new Error(privateMarker);
        },
      },
      stack: {
        get() {
          reads.push("stack");
          throw new Error(privateMarker);
        },
      },
      toString: {
        get() {
          reads.push("toString");
          throw new Error(privateMarker);
        },
      },
    });
    const showToast = vi.fn(async () => undefined);

    await executeQuickAddCommandShell(
      dependencies(
        vi.fn(() => Promise.reject(hostileFailure)),
        ports(effects(showToast))
      ),
      Object.freeze({ text: "private task" })
    );

    expect(reads).toEqual([]);
    expect(boundary.presentQuickAddCommandFailure).toHaveBeenCalledOnce();
    expect(boundary.presentQuickAddCommandFailure.mock.calls[0]?.[0] === hostileFailure).toBe(true);
    expect(showToast).toHaveBeenCalledWith(SAFE_FAILURE_TOAST);
    expect(JSON.stringify(showToast.mock.calls)).not.toContain(privateMarker);
  });

  it.each(["effects accessor", "showToast accessor", "non-function showToast"] as const)(
    "treats a failing %s as unavailable best-effort presentation without blocking bootstrap handling",
    async (failureMode) => {
      const privateMarker = `private-${failureMode}`;
      let effectsReads = 0;
      let showToastReads = 0;
      const commandEffects = Object.defineProperty({ closeMainWindow: vi.fn(async () => undefined) }, "showToast", {
        get() {
          showToastReads += 1;
          if (failureMode === "showToast accessor") throw new Error(privateMarker);
          return failureMode === "non-function showToast" ? Object.freeze({}) : vi.fn();
        },
      }) as unknown as QuickAddCommandEffects;
      const commandPorts = Object.defineProperties(
        {
          preferences: Object.freeze({ load: vi.fn(), remember: vi.fn() }),
          loadDefaults: vi.fn(),
        },
        {
          effects: {
            get() {
              effectsReads += 1;
              if (failureMode === "effects accessor") throw new Error(privateMarker);
              return commandEffects;
            },
          },
        }
      ) as unknown as QuickAddCommandRuntimePorts;
      const bootstrapFailure = new Error("private bootstrap failure");
      const bootstrap = vi.fn(() => Promise.reject(bootstrapFailure));

      await expect(
        executeQuickAddCommandShell(dependencies(bootstrap, commandPorts), Object.freeze({ text: "private task" }))
      ).resolves.toBeUndefined();

      expect(effectsReads).toBe(1);
      expect(showToastReads).toBe(failureMode === "effects accessor" ? 0 : 1);
      expect(bootstrap).toHaveBeenCalledOnce();
      expect(boundary.presentQuickAddCommandFailure).not.toHaveBeenCalled();
      expect(boundary.executeQuickAddFromRuntime).not.toHaveBeenCalled();
    }
  );

  it.each(["throws", "rejects"] as const)(
    "swallows a failure-toast invocation that %s without retrying or leaking",
    async (mode) => {
      const privateMarker = `private-showToast-${mode}`;
      const showToast = vi.fn(function (this: unknown) {
        if (mode === "throws") throw new Error(privateMarker);
        return Promise.reject(new Error(privateMarker));
      });
      const commandEffects = effects(showToast);
      const bootstrap = vi.fn(() => Promise.reject(new Error("private bootstrap failure")));

      await expect(
        executeQuickAddCommandShell(
          dependencies(bootstrap, ports(commandEffects)),
          Object.freeze({ text: "private task" })
        )
      ).resolves.toBeUndefined();

      expect(bootstrap).toHaveBeenCalledOnce();
      expect(showToast).toHaveBeenCalledOnce();
      expect(showToast).toHaveBeenCalledWith(SAFE_FAILURE_TOAST);
      expect(boundary.executeQuickAddFromRuntime).not.toHaveBeenCalled();
    }
  );

  it("reads each injected boundary once and preserves the bootstrap and showToast receivers", async () => {
    const reads = { bootstrap: 0, ports: 0, effects: 0, showToast: 0 };
    const failure = new Error("private receiver-safe bootstrap failure");
    const commandEffectsReceiver = { closeMainWindow: vi.fn(async () => undefined) };
    const showToast = function (this: unknown, toast: QuickAddCommandToast) {
      expect(this).toBe(commandEffectsReceiver);
      expect(toast).toBe(SAFE_FAILURE_TOAST);
    };
    const commandEffects = Object.defineProperties(commandEffectsReceiver, {
      showToast: {
        get() {
          reads.showToast += 1;
          return showToast;
        },
      },
    }) as unknown as QuickAddCommandEffects;
    const commandPorts = Object.defineProperties(
      {
        preferences: Object.freeze({ load: vi.fn(), remember: vi.fn() }),
        loadDefaults: vi.fn(),
      },
      {
        effects: {
          get() {
            reads.effects += 1;
            return commandEffects;
          },
        },
      }
    ) as unknown as QuickAddCommandRuntimePorts;
    const dependencyReceiver = {};
    const bootstrap: CommandRuntimeBootstrap = function (this: QuickAddCommandShellDependencies) {
      expect(this).toBe(dependencyReceiver);
      throw failure;
    };
    const deps = Object.defineProperties(dependencyReceiver, {
      ports: {
        get() {
          reads.ports += 1;
          return commandPorts;
        },
      },
      bootstrap: {
        get() {
          reads.bootstrap += 1;
          return bootstrap;
        },
      },
    }) as QuickAddCommandShellDependencies;

    await executeQuickAddCommandShell(deps, Object.freeze({ text: "private task" }));

    expect(reads).toEqual({ bootstrap: 1, ports: 1, effects: 1, showToast: 1 });
    expect(boundary.presentQuickAddCommandFailure).toHaveBeenCalledWith(failure);
  });

  it("does not add a second toast when the delegated runtime presents terminal ambiguity", async () => {
    const ambiguousToast: QuickAddCommandToast = Object.freeze({
      style: "failure",
      title: "Task Creation Status Unknown",
      message: "TickTick may have created this task. Check TickTick before trying again.",
    });
    const showToast = vi.fn<(toast: QuickAddCommandToast) => Promise<void>>(async () => undefined);
    boundary.executeQuickAddFromRuntime.mockImplementation(async () => {
      await showToast(ambiguousToast);
    });

    await executeQuickAddCommandShell(
      dependencies(
        vi.fn(() => bootstrapInput),
        ports(effects(showToast))
      ),
      Object.freeze({ text: "private task" })
    );

    expect(boundary.executeQuickAddFromRuntime).toHaveBeenCalledOnce();
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(ambiguousToast);
    expect(boundary.presentQuickAddCommandFailure).not.toHaveBeenCalled();
  });

  it.each([
    ["ordinary", new Error("private delegated failure")],
    ["ambiguous", new AmbiguousMutationError("private delegated ambiguity")],
  ] as const)(
    "propagates a delegated %s rejection by identity without retry or shell toast",
    async (_kind, failure) => {
      const showToast = vi.fn(async () => undefined);
      boundary.executeQuickAddFromRuntime.mockRejectedValue(failure);
      const running = executeQuickAddCommandShell(
        dependencies(
          vi.fn(() => bootstrapInput),
          ports(effects(showToast))
        ),
        Object.freeze({ text: "private task" })
      );

      await expect(running).rejects.toBe(failure);

      expect(boundary.createReadyCommandRuntime).toHaveBeenCalledOnce();
      expect(boundary.executeQuickAddFromRuntime).toHaveBeenCalledOnce();
      expect(boundary.presentQuickAddCommandFailure).not.toHaveBeenCalled();
      expect(showToast).not.toHaveBeenCalled();
    }
  );

  it("preserves frozen ports and a hostile input by identity without inspection or mutation", async () => {
    const inputReads: PropertyKey[] = [];
    const input = new Proxy(Object.freeze({}), {
      get(_target, property) {
        inputReads.push(property);
        throw new Error("private input inspection");
      },
      set() {
        throw new Error("private input mutation");
      },
    }) as QuickAddCommandInput;
    const commandPorts = ports();
    const deps = dependencies(Object.freeze(vi.fn(() => bootstrapInput)), commandPorts);

    await executeQuickAddCommandShell(deps, input);

    const [, delegatedPorts, delegatedInput] = boundary.executeQuickAddFromRuntime.mock.calls[0] ?? [];
    expect(delegatedPorts).toBe(commandPorts);
    expect(delegatedInput).toBe(input);
    expect(inputReads).toEqual([]);
    expect(Object.isFrozen(commandPorts)).toBe(true);
    expect(Object.isFrozen(deps)).toBe(true);
  });

  it("finds multiline, side-effect, type, and import-equals declarations without reading decoy text", () => {
    const source = [
      '// import "../comment";',
      'const decoy = "import \\"../string\\";";',
      "import {",
      "  createReadyCommandRuntime,",
      '} from "../application/commandRuntime";',
      'import type { QuickAddCommandInput } from "./executeQuickAddCommand";',
      'import "../side-effect";',
      'import hidden = require("node:fs");',
    ].join("\n");

    expect(staticImportDeclarations(source)).toEqual([
      {
        moduleSpecifier: "../application/commandRuntime",
        declaration: 'import {\n  createReadyCommandRuntime,\n} from "../application/commandRuntime";',
      },
      {
        moduleSpecifier: "./executeQuickAddCommand",
        declaration: 'import type { QuickAddCommandInput } from "./executeQuickAddCommand";',
      },
      { moduleSpecifier: "../side-effect", declaration: 'import "../side-effect";' },
      { moduleSpecifier: "node:fs", declaration: 'import hidden = require("node:fs");' },
    ]);
  });

  it("fails closed for invalid source and non-external import-equals declarations", () => {
    expect(() => staticImportDeclarations('import { broken from "../broken";')).toThrow(
      "Quick Add shell import audit source is invalid."
    );
    expect(() => staticImportDeclarations("import hidden = namespace.member;")).toThrow(
      "Quick Add shell import audit found an unsupported import-equals declaration."
    );
  });

  it("keeps the shell to the exact static, backend-neutral composition boundary", () => {
    const source = readFileSync(resolve(__dirname, "quickAddCommandShell.ts"), "utf8");

    expect(staticImportDeclarations(source)).toEqual([
      {
        moduleSpecifier: "../application/commandRuntime",
        declaration:
          'import { createReadyCommandRuntime, type CommandRuntimeBootstrap } from "../application/commandRuntime";',
      },
      {
        moduleSpecifier: "./executeQuickAddCommand",
        declaration:
          'import {\n  presentQuickAddCommandFailure,\n  type QuickAddCommandInput,\n  type QuickAddCommandToast,\n} from "./executeQuickAddCommand";',
      },
      {
        moduleSpecifier: "./quickAddCommandRuntime",
        declaration:
          'import { executeQuickAddFromRuntime, type QuickAddCommandRuntimePorts } from "./quickAddCommandRuntime";',
      },
    ]);
    expect(source).not.toMatch(
      /@raycast\/api|LocalStorage|McpTickTickBackend|OpenApiTickTickBackend|BackendFactory|\.\.\/service|AppleScript|run-applescript|\bfetch\s*\(|XMLHttpRequest|WebSocket|console\.|setTimeout|setInterval|Task8|RELEASE|BACKEND_|\bimport\s*\(|\brequire\s*\(/u
    );
  });
});
