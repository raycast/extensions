import { vi } from "vitest";
import { Note, Task, TaskDomain } from "../src/lib/api";
import { ToolCaller } from "../src/lib/mcp";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

export function aNote(overrides: Partial<Note> = {}): Note {
  return { uuid: nextId("note"), name: "A note", tags: [], changed: "2026-10-18T10:00:00+02:00", ...overrides };
}

export function aTask(overrides: Partial<Task> = {}): Task {
  return {
    uuid: nextId("task"),
    noteUUID: "note-1",
    content: "Do the thing",
    startAt: null,
    deadline: null,
    hideUntil: null,
    important: false,
    urgent: false,
    isRepeating: false,
    ...overrides,
  };
}

export function aTaskDomain(overrides: Partial<TaskDomain> = {}): TaskDomain {
  return { uuid: nextId("domain"), name: "Work", notes: [], ...overrides };
}

type Handler = (args: Record<string, unknown>) => unknown;

/**
 * A stand-in for Amplenote's MCP server. Each handler answers one MCP tool by name,
 * and every call is recorded so tests can check what the extension sent.
 */
export function fakeAmplenote(handlers: Record<string, Handler>) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const call: ToolCaller = async <T>(name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    const handler = handlers[name];
    if (!handler) throw new Error(`Unexpected MCP call: ${name}`);
    return (await handler(args)) as T;
  };
  return { call: vi.fn(call) as ToolCaller, calls, callsTo: (name: string) => calls.filter((c) => c.name === name) };
}

export const secondsFromNow = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;
