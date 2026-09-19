import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ReactElement } from "react";
import * as ts from "typescript";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { CommandRuntimeBootstrap, CommandRuntimeState } from "../application/commandRuntime";
import type { TaskListRuntime } from "../components/TaskListView";
import {
  INBOX_COMMAND,
  NEXT_SEVEN_COMMAND,
  SEARCH_COMMAND,
  TODAY_COMMAND,
  type TaskCommandConfig,
} from "./taskCommandConfigs";
import type { TaskListCommandRuntimeOptions } from "./taskListCommandRuntime";

const boundary = vi.hoisted(() => ({
  useCommandRuntime: vi.fn(),
  projectTaskListCommandRuntime: vi.fn(),
  MockTaskListView: vi.fn(),
}));

vi.mock("../hooks/useCommandRuntime", () => ({ useCommandRuntime: boundary.useCommandRuntime }));
vi.mock("./taskListCommandRuntime", () => ({ projectTaskListCommandRuntime: boundary.projectTaskListCommandRuntime }));
vi.mock("../components/TaskListView", () => ({ TaskListView: boundary.MockTaskListView }));

import TaskListCommandShell, { type TaskListCommandShellProps } from "./taskListCommandShell";

type TaskListChildProps = Readonly<{ config: TaskCommandConfig; runtime: TaskListRuntime }>;
type StaticImportDeclaration = Readonly<{ moduleSpecifier: string; declaration: string }>;

const loadingState = Object.freeze({ kind: "loading" }) as CommandRuntimeState;
const errorState = Object.freeze({ kind: "error", error: new Error("PRIVATE runtime error") }) as CommandRuntimeState;
const readyState = Object.freeze({ kind: "ready" }) as CommandRuntimeState;
const loadingRuntime = Object.freeze({ kind: "loading" }) as TaskListRuntime;
const errorRuntime = Object.freeze({
  kind: "error",
  presentation: Object.freeze({ title: "PRIVATE error", message: "PRIVATE message", actions: Object.freeze([]) }),
}) as TaskListRuntime;
const readyRuntime = Object.freeze({ kind: "ready" }) as TaskListRuntime;

function options(exactLinkStrategy: undefined | "backend-url" = undefined): TaskListCommandRuntimeOptions {
  return Object.freeze({ uiTimeZone: "America/Denver", exactLinkStrategy });
}

function props(config: TaskCommandConfig = TODAY_COMMAND): TaskListCommandShellProps {
  return Object.freeze({
    bootstrap: vi.fn() as unknown as CommandRuntimeBootstrap,
    contextKey: "task-list-shell-context",
    config,
    options: options(),
  });
}

function render(input: TaskListCommandShellProps): ReactElement<TaskListChildProps> {
  return TaskListCommandShell(input) as ReactElement<TaskListChildProps>;
}

function staticImportDeclarations(source: string): readonly StaticImportDeclaration[] {
  const diagnostics = ts.transpileModule(source, {
    fileName: "taskListCommandShell-import-audit.tsx",
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.Latest },
  }).diagnostics;
  if (diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
    throw new Error("Task-list shell import audit source is invalid.");
  }

  const sourceFile = ts.createSourceFile(
    "taskListCommandShell-import-audit.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
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
      throw new Error("Task-list shell import audit found an unsupported import-equals declaration.");
    }

    return [{ moduleSpecifier: statement.moduleReference.expression.text, declaration: statement.getText(sourceFile) }];
  });
}

describe("TaskListCommandShell", () => {
  beforeEach(() => {
    boundary.useCommandRuntime.mockReset();
    boundary.projectTaskListCommandRuntime.mockReset();
    boundary.MockTaskListView.mockReset();
    boundary.useCommandRuntime.mockReturnValue(loadingState);
    boundary.projectTaskListCommandRuntime.mockReturnValue(loadingRuntime);
  });

  it("locks the public readonly props and ReactElement return type", () => {
    expectTypeOf<TaskListCommandShellProps>().toEqualTypeOf<
      Readonly<{
        bootstrap: CommandRuntimeBootstrap;
        contextKey: string;
        config: TaskCommandConfig;
        options: TaskListCommandRuntimeOptions;
      }>
    >();
    expectTypeOf(TaskListCommandShell).returns.toEqualTypeOf<ReactElement>();
    expectTypeOf(TaskListCommandShell).parameter(0).toEqualTypeOf<TaskListCommandShellProps>();
  });

  it.each([
    ["loading", loadingState, loadingRuntime],
    ["error", errorState, errorRuntime],
    ["ready", readyState, readyRuntime],
  ] as const)("projects and renders %s state through both composition boundaries", (_name, state, projected) => {
    const input = props();
    boundary.useCommandRuntime.mockReturnValue(state);
    boundary.projectTaskListCommandRuntime.mockReturnValue(projected);

    const child = render(input);

    expect(boundary.useCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.useCommandRuntime).toHaveBeenCalledWith(input.bootstrap, input.contextKey);
    expect(boundary.projectTaskListCommandRuntime).toHaveBeenCalledOnce();
    expect(boundary.projectTaskListCommandRuntime).toHaveBeenCalledWith(state, input.options);
    expect(child.type).toBe(boundary.MockTaskListView);
    expect(child.props.config).toBe(input.config);
    expect(child.props.runtime).toBe(projected);
  });

  it.each([TODAY_COMMAND, NEXT_SEVEN_COMMAND, INBOX_COMMAND, SEARCH_COMMAND])(
    "forwards each command config by identity without inspecting or copying it",
    (config) => {
      const child = render(props(config));

      expect(child.props.config).toBe(config);
    }
  );

  it("forwards bootstrap, context key, options, and projected runtime by identity", () => {
    const bootstrap = vi.fn() as unknown as CommandRuntimeBootstrap;
    const contextKey = "task-list-identity-context";
    const runtimeOptions = options();
    const input = Object.freeze({ bootstrap, contextKey, config: TODAY_COMMAND, options: runtimeOptions });
    const projected = Object.freeze({ kind: "loading" }) as TaskListRuntime;
    boundary.projectTaskListCommandRuntime.mockReturnValue(projected);

    const child = render(input);

    expect(boundary.useCommandRuntime).toHaveBeenCalledWith(bootstrap, contextKey);
    expect(boundary.projectTaskListCommandRuntime).toHaveBeenCalledWith(loadingState, runtimeOptions);
    expect(runtimeOptions.exactLinkStrategy).toBeUndefined();
    expect(Object.hasOwn(runtimeOptions, "exactLinkStrategy")).toBe(true);
    expect(child.props.runtime).toBe(projected);
  });

  it("does not inspect or mutate frozen hostile accepted-boundary inputs", () => {
    const config = new Proxy(Object.freeze({}), {
      get() {
        throw new Error("PRIVATE config inspection");
      },
      set() {
        throw new Error("PRIVATE config mutation");
      },
    }) as TaskCommandConfig;
    const runtimeOptions = new Proxy(Object.freeze({}), {
      get() {
        throw new Error("PRIVATE options inspection");
      },
      set() {
        throw new Error("PRIVATE options mutation");
      },
    }) as TaskListCommandRuntimeOptions;
    const bootstrap = Object.freeze(vi.fn()) as unknown as CommandRuntimeBootstrap;
    const input = Object.freeze({ bootstrap, contextKey: "hostile-boundary-context", config, options: runtimeOptions });

    const child = render(input);

    expect(boundary.useCommandRuntime).toHaveBeenCalledWith(bootstrap, input.contextKey);
    const [receivedState, receivedOptions] = boundary.projectTaskListCommandRuntime.mock.calls[0] ?? [];
    expect(receivedState).toBe(loadingState);
    expect(receivedOptions).toBe(runtimeOptions);
    expect(child.props.config).toBe(config);
    expect(child.props.runtime).toBe(loadingRuntime);
    expect(Object.isFrozen(bootstrap)).toBe(true);
  });

  it("delegates error recovery to the runtime projection and child view", () => {
    const input = props();
    boundary.useCommandRuntime.mockReturnValue(errorState);
    boundary.projectTaskListCommandRuntime.mockReturnValue(errorRuntime);

    const child = render(input);

    expect(boundary.projectTaskListCommandRuntime).toHaveBeenCalledWith(errorState, input.options);
    expect(child.type).toBe(boundary.MockTaskListView);
    expect(child.props.runtime).toBe(errorRuntime);
  });

  it("finds multiline and side-effect imports in source order", () => {
    const source = [
      "import {",
      "  TaskListView,",
      '} from "../components/TaskListView";',
      'import "../side-effect";',
    ].join("\n");

    expect(staticImportDeclarations(source)).toEqual([
      {
        moduleSpecifier: "../components/TaskListView",
        declaration: 'import {\n  TaskListView,\n} from "../components/TaskListView";',
      },
      { moduleSpecifier: "../side-effect", declaration: 'import "../side-effect";' },
    ]);
  });

  it("finds external import-equals declarations in source order", () => {
    const source = [
      'import { TaskListView } from "../components/TaskListView";',
      'import hidden = require("node:fs");',
    ].join("\n");

    expect(staticImportDeclarations(source)).toEqual([
      {
        moduleSpecifier: "../components/TaskListView",
        declaration: 'import { TaskListView } from "../components/TaskListView";',
      },
      { moduleSpecifier: "node:fs", declaration: 'import hidden = require("node:fs");' },
    ]);
  });

  it("rejects non-external import-equals declarations", () => {
    expect(() => staticImportDeclarations("import hidden = namespace.member;")).toThrow(
      "Task-list shell import audit found an unsupported import-equals declaration."
    );
  });

  it("ignores comments and string literals while retaining type imports", () => {
    const source = [
      '// import "../comment";',
      'const text = "import \\"../string-literal\\";";',
      '/* import "../block-comment"; */',
      'import type { TaskCommandConfig } from "./taskCommandConfigs";',
    ].join("\n");

    expect(staticImportDeclarations(source)).toEqual([
      {
        moduleSpecifier: "./taskCommandConfigs",
        declaration: 'import type { TaskCommandConfig } from "./taskCommandConfigs";',
      },
    ]);
  });

  it("fails when TypeScript reports import parse diagnostics", () => {
    expect(() => staticImportDeclarations('import { TaskListView from "../components/TaskListView";')).toThrow(
      "Task-list shell import audit source is invalid."
    );
  });

  it("keeps the production shell to the static composition import boundary", () => {
    const source = readFileSync(resolve(__dirname, "taskListCommandShell.tsx"), "utf8");

    expect(staticImportDeclarations(source)).toEqual([
      { moduleSpecifier: "react", declaration: 'import type { ReactElement } from "react";' },
      {
        moduleSpecifier: "../application/commandRuntime",
        declaration: 'import type { CommandRuntimeBootstrap } from "../application/commandRuntime";',
      },
      {
        moduleSpecifier: "../components/TaskListView",
        declaration: 'import { TaskListView } from "../components/TaskListView";',
      },
      {
        moduleSpecifier: "../hooks/useCommandRuntime",
        declaration: 'import { useCommandRuntime } from "../hooks/useCommandRuntime";',
      },
      {
        moduleSpecifier: "./taskCommandConfigs",
        declaration: 'import type { TaskCommandConfig } from "./taskCommandConfigs";',
      },
      {
        moduleSpecifier: "./taskListCommandRuntime",
        declaration:
          'import { projectTaskListCommandRuntime, type TaskListCommandRuntimeOptions } from "./taskListCommandRuntime";',
      },
    ]);
    expect(source).toContain("const state = useCommandRuntime(props.bootstrap, props.contextKey);");
    expect(source).toContain("const projected = projectTaskListCommandRuntime(state, props.options);");
    expect(source).toContain("return <TaskListView config={props.config} runtime={projected} />;");
    expect(source).not.toMatch(
      /@raycast\/api|LocalStorage|McpTickTickBackend|OpenApiTickTickBackend|BackendFactory|\.\.\/service|AppleScript|\bfetch\s*\(|XMLHttpRequest|WebSocket|setTimeout|setInterval|console\.|Task8|taskLinks|EXACT_LINK|RELEASE|BACKEND_/u
    );
  });
});
