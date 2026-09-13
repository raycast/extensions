import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { CommandRuntimeBootstrap, CommandRuntimeState } from "../application/commandRuntime";
import type { CreateTaskRuntime } from "../components/CreateTaskCommand";
import type { CreateTaskCommandRuntimeDependencies } from "./createTaskCommandRuntime";
import { CreateTaskCommandShell, type CreateTaskCommandShellProps } from "./createTaskCommandShell";

const boundary = vi.hoisted(() => ({
  useCommandRuntime: vi.fn(),
  useCreateTaskCommandRuntime: vi.fn(),
  CreateTaskCommand: vi.fn(() => null),
}));

vi.mock("../hooks/useCommandRuntime", () => ({ useCommandRuntime: boundary.useCommandRuntime }));
vi.mock("../hooks/useCreateTaskCommandRuntime", () => ({
  useCreateTaskCommandRuntime: boundary.useCreateTaskCommandRuntime,
}));
vi.mock("../components/CreateTaskCommand", () => ({
  CreateTaskCommand: boundary.CreateTaskCommand,
  default: boundary.CreateTaskCommand,
}));

const loadingCommandRuntime: CommandRuntimeState = Object.freeze({ kind: "loading" });
const errorCommandRuntime: CommandRuntimeState = Object.freeze({
  kind: "error",
  error: Object.freeze({ private: "bootstrap marker" }),
});
const readyCommandRuntime = Object.freeze({
  kind: "ready",
  private: "raw runtime marker",
}) as unknown as CommandRuntimeState;

const loadingCreateRuntime: CreateTaskRuntime = Object.freeze({ kind: "loading" });
const errorCreateRuntime: CreateTaskRuntime = Object.freeze({
  kind: "error",
  error: Object.freeze({ private: "preparation marker" }),
});
const readyCreateRuntime = Object.freeze({
  kind: "ready",
  private: "prepared runtime marker",
}) as unknown as CreateTaskRuntime;

function renderedRuntime(element: ReactElement): CreateTaskRuntime {
  return (element.props as Readonly<{ runtime: CreateTaskRuntime }>).runtime;
}

function bootstrap(): CommandRuntimeBootstrap {
  return vi.fn(async () => Promise.reject(new Error("unused bootstrap")));
}

function dependencies(): CreateTaskCommandRuntimeDependencies {
  return Object.freeze({
    preferences: Object.freeze({
      load: vi.fn(async () => undefined),
      remember: vi.fn(async () => undefined),
    }),
    loadDefaults: vi.fn(async () => Object.freeze({ uiTimeZone: "America/Denver" })),
    fieldAvailability: Object.freeze({ project: true }),
  });
}

beforeEach(() => {
  boundary.useCommandRuntime.mockReset();
  boundary.useCreateTaskCommandRuntime.mockReset();
  boundary.CreateTaskCommand.mockClear();
});

describe("CreateTaskCommandShell", () => {
  it("exports the exact readonly injected shell API", () => {
    expectTypeOf<CreateTaskCommandShellProps>().toEqualTypeOf<
      Readonly<{
        bootstrap: CommandRuntimeBootstrap;
        contextKey: string;
        dependencies: CreateTaskCommandRuntimeDependencies;
      }>
    >();
    expectTypeOf(CreateTaskCommandShell).parameter(0).toEqualTypeOf<CreateTaskCommandShellProps>();
    expectTypeOf(CreateTaskCommandShell).returns.toEqualTypeOf<ReactElement>();
  });

  it.each([
    ["loading", loadingCommandRuntime, loadingCreateRuntime],
    ["error", errorCommandRuntime, errorCreateRuntime],
    ["ready", readyCommandRuntime, readyCreateRuntime],
  ] as const)("unconditionally composes the hooks and command for %s state", (_kind, commandRuntime, createRuntime) => {
    const events: string[] = [];
    const load = bootstrap();
    const injectedDependencies = dependencies();
    boundary.useCommandRuntime.mockImplementation(() => {
      events.push("command-runtime");
      return commandRuntime;
    });
    boundary.useCreateTaskCommandRuntime.mockImplementation(() => {
      events.push("create-runtime");
      return createRuntime;
    });

    const element = CreateTaskCommandShell({
      bootstrap: load,
      contextKey: "semantic-context",
      dependencies: injectedDependencies,
    });

    expect(events).toEqual(["command-runtime", "create-runtime"]);
    expect(boundary.useCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.useCommandRuntime).toHaveBeenCalledWith(load, "semantic-context");
    expect(boundary.useCreateTaskCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.useCreateTaskCommandRuntime).toHaveBeenCalledWith(commandRuntime, injectedDependencies);
    expect(element.type).toBe(boundary.CreateTaskCommand);
    expect(renderedRuntime(element)).toBe(createRuntime);
  });

  it("preserves hook order across loading, error, and ready transitions without conditional calls", () => {
    const events: string[] = [];
    const load = bootstrap();
    const injectedDependencies = dependencies();
    const commandStates = [loadingCommandRuntime, errorCommandRuntime, readyCommandRuntime];
    const createStates = [loadingCreateRuntime, errorCreateRuntime, readyCreateRuntime];
    let renderIndex = 0;
    boundary.useCommandRuntime.mockImplementation(() => {
      events.push(`command-${renderIndex}`);
      return commandStates[renderIndex];
    });
    boundary.useCreateTaskCommandRuntime.mockImplementation(() => {
      events.push(`create-${renderIndex}`);
      return createStates[renderIndex++];
    });

    const rendered = commandStates.map(() =>
      CreateTaskCommandShell({
        bootstrap: load,
        contextKey: "stable-context",
        dependencies: injectedDependencies,
      })
    );

    expect(events).toEqual(["command-0", "create-0", "command-1", "create-1", "command-2", "create-2"]);
    expect(boundary.useCommandRuntime).toHaveBeenCalledTimes(3);
    expect(boundary.useCreateTaskCommandRuntime).toHaveBeenCalledTimes(3);
    expect(rendered.map(renderedRuntime)).toEqual(createStates);
  });

  it("preserves injected identities and does not mutate frozen inputs", () => {
    const load = Object.freeze(bootstrap());
    const injectedDependencies = dependencies();
    const props = Object.freeze({
      bootstrap: load,
      contextKey: "identity-context",
      dependencies: injectedDependencies,
    });
    boundary.useCommandRuntime.mockReturnValue(readyCommandRuntime);
    boundary.useCreateTaskCommandRuntime.mockReturnValue(readyCreateRuntime);

    const element = CreateTaskCommandShell(props);

    expect(boundary.useCommandRuntime).toHaveBeenCalledWith(load, props.contextKey);
    expect(boundary.useCreateTaskCommandRuntime).toHaveBeenCalledWith(readyCommandRuntime, injectedDependencies);
    expect(renderedRuntime(element)).toBe(readyCreateRuntime);
    expect(Object.isFrozen(props)).toBe(true);
    expect(Object.isFrozen(injectedDependencies)).toBe(true);
    expect(props).toEqual({ bootstrap: load, contextKey: "identity-context", dependencies: injectedDependencies });
  });

  it("uses only the accepted injected composition boundaries", () => {
    const source = readFileSync(resolve(__dirname, "createTaskCommandShell.tsx"), "utf8");
    const imports = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), ([, path]) => path);
    const allowedImports = new Set([
      "react",
      "../application/commandRuntime",
      "../components/CreateTaskCommand",
      "../hooks/useCommandRuntime",
      "../hooks/useCreateTaskCommandRuntime",
      "./createTaskCommandRuntime",
    ]);

    expect(imports.length).toBeGreaterThan(0);
    expect(imports.every((path) => allowedImports.has(path))).toBe(true);
    expect(source).not.toMatch(
      /@raycast\/api|LocalStorage|infrastructure\/(?:auth|backend|cache|macos|mcp|openapi)|BackendFactory|TaskRepository|TickTickBackend|run-applescript|\bfetch\b|XMLHttpRequest|WebSocket|console\.|setTimeout|setInterval|Task8/i
    );
    expect(source).toMatch(/useCommandRuntime[\s\S]*useCreateTaskCommandRuntime[\s\S]*<CreateTaskCommand\s+runtime=/);
  });
});
