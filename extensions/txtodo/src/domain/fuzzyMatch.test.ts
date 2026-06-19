import { describe, expect, it } from "vitest";
import { bestMatch } from "./fuzzyMatch";
import { parseLine } from "./parser";

describe("bestMatch", () => {
  it("returns the only task whose description contains the query token", () => {
    const tasks = [
      parseLine("Pay invoice", 0),
      parseLine("Draft launch email", 1),
      parseLine("Pick up dry cleaning", 2),
    ];
    expect(bestMatch(tasks, "launch")?.lineNumber).toBe(1);
  });

  it("prefers tasks matching more query tokens", () => {
    const tasks = [
      parseLine("Draft launch email for the new product", 0),
      parseLine("Launch the website", 1),
      parseLine("Send a launch email", 2),
    ];
    // "launch email" — task 0 and task 2 both have both tokens; task 1 only "launch".
    // Tie between 0 and 2: lower lineNumber wins → 0.
    expect(bestMatch(tasks, "launch email")?.lineNumber).toBe(0);
  });

  it("breaks ties by preferring the lower lineNumber", () => {
    const tasks = [parseLine("Email Bob", 3), parseLine("Email Alice", 7), parseLine("Email Carol", 1)];
    expect(bestMatch(tasks, "email")?.lineNumber).toBe(1);
  });

  it("returns null when no task matches", () => {
    const tasks = [parseLine("Read book", 0), parseLine("Walk the dog", 1)];
    expect(bestMatch(tasks, "xyzzy")).toBeNull();
  });

  it("ignores tokens shorter than 2 characters", () => {
    const tasks = [parseLine("a quick brown fox", 0), parseLine("nothing related", 1)];
    // Only "quick" and "brown" and "fox" are real tokens — short "a" is dropped.
    expect(bestMatch(tasks, "a quick")?.lineNumber).toBe(0);
    // Query "a" alone → no usable tokens → null.
    expect(bestMatch(tasks, "a")).toBeNull();
  });

  it("matches case-insensitively", () => {
    const tasks = [parseLine("Draft Launch Email", 0)];
    expect(bestMatch(tasks, "LAUNCH EMAIL")?.lineNumber).toBe(0);
  });

  it("returns null for empty task list", () => {
    expect(bestMatch([], "anything")).toBeNull();
  });

  it("returns null when query has no usable tokens", () => {
    const tasks = [parseLine("Anything", 0)];
    expect(bestMatch(tasks, "")).toBeNull();
    expect(bestMatch(tasks, "   ")).toBeNull();
  });
});
