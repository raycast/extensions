import type { ChildLike } from "../src/digup/service";

/** Stands in for the helper process: records what is written to it, and says what a test tells it to. */
export class FakeChild implements ChildLike {
  written: string[] = [];
  ended = false;
  killed = false;
  private readonly output: ((chunk: Buffer | string) => void)[] = [];
  private readonly errors: ((chunk: Buffer | string) => void)[] = [];
  private readonly exits: ((...args: unknown[]) => void)[] = [];
  private readonly failures: ((...args: unknown[]) => void)[] = [];

  stdin = {
    write: (chunk: string) => {
      this.written.push(chunk);
      return true;
    },
    end: () => {
      this.ended = true;
    },
  };
  stdout = {
    on: (_event: "data", listener: (chunk: Buffer | string) => void) => {
      this.output.push(listener);
    },
  };
  stderr = {
    on: (_event: "data", listener: (chunk: Buffer | string) => void) => {
      this.errors.push(listener);
    },
  };

  on(event: "exit" | "error", listener: (...args: unknown[]) => void) {
    if (event === "exit") this.exits.push(listener);
    else this.failures.push(listener);
  }

  /** The helper could not be started, or broke: Node reports that as an "error" event. */
  fail(error: Error) {
    for (const listener of this.failures) listener(error);
  }

  kill() {
    this.killed = true;
    this.exit(null);
  }

  /** What was written to the helper, as requests. */
  get requests(): Record<string, unknown>[] {
    return this.written.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  /** The helper prints a line. */
  say(message: unknown) {
    this.raw(Buffer.from(JSON.stringify(message) + "\n"));
  }

  raw(chunk: Buffer | string) {
    for (const listener of this.output) listener(chunk);
  }

  complain(text: string) {
    for (const listener of this.errors) listener(text);
  }

  exit(code: number | null) {
    for (const listener of this.exits) listener(code);
  }
}
