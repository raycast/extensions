import { vi } from "vitest";

type EventHandler = (...args: unknown[]) => void;

function makeMockStream() {
  const handlers = new Map<string, EventHandler[]>();
  return {
    on: vi.fn((event: string, handler: EventHandler) => {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(handler);
      return this;
    }),
    write: vi.fn(),
    end: vi.fn(),
    _emit: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.forEach((h) => h(...args));
    },
  };
}

export const execFile = vi.fn();
export const spawn = vi.fn(() => ({
  stdout: makeMockStream(),
  stderr: makeMockStream(),
  stdin: makeMockStream(),
  on: vi.fn((event: string, handler: EventHandler) => {
    // Callers attach 'close' and 'error' on the child process itself
    if (!childProcessHandlers.has(event)) childProcessHandlers.set(event, []);
    childProcessHandlers.get(event)!.push(handler);
    return this;
  }),
  kill: vi.fn(),
}));

const childProcessHandlers = new Map<string, EventHandler[]>();

/**
 * Simulate the child process emitting an event (close, error).
 * Used in tests to control process lifecycle.
 */
export function _emitChildEvent(event: string, ...args: unknown[]) {
  childProcessHandlers.get(event)?.forEach((h) => h(...args));
}

export function _resetChildHandlers() {
  childProcessHandlers.clear();
}
