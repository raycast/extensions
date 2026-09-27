import * as Module from "module";

// Install @raycast/api runtime shim for Node.js test execution
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string) {
  if (id === "@raycast/api") {
    return {
      Color: {
        Green: "raycast-color-green",
        Yellow: "raycast-color-yellow",
        Orange: "raycast-color-orange",
        Red: "raycast-color-red",
        Blue: "raycast-color-blue",
        Purple: "raycast-color-purple",
        SecondaryText: "raycast-color-secondary",
        PrimaryText: "raycast-color-primary",
      },
      Icon: {
        HardDrive: "hard-drive",
        MemoryStick: "memory-stick",
        Usb: "memory-stick",
        Network: "network",
        Cd: "cd",
        Folder: "folder",
        Terminal: "terminal",
        Trash: "trash",
        Gear: "gear",
        Eject: "eject",
        Clipboard: "clipboard",
        ArrowClockwise: "arrow-clockwise",
        ExclamationMark: "exclamation-mark",
      },
      Toast: {
        Style: {
          Success: "success",
          Failure: "failure",
          Animated: "animated",
        },
      },
      showToast: async (options: any) => ({
        hide: () => {},
        show: () => {},
        title: options.title,
      }),
      showHUD: async (title: string) => {},
      confirmAlert: async (options: any) => true,
      Clipboard: {
        copy: async (text: string) => {},
        readText: async () => "",
      },
      open: async (target: string) => {},
    };
  }
  return originalRequire.apply(this, arguments as any);
};

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: Error;
  durationMs: number;
}

export interface SuiteStats {
  suiteName: string;
  tests: TestResult[];
  passCount: number;
  failCount: number;
  assertionCount: number;
  durationMs: number;
}

// Global registry
let currentSuite = "Default Suite";
let totalAssertions = 0;
const registeredSuites: Map<string, Array<{ name: string; fn: () => void | Promise<void> }>> = new Map();

export function describe(name: string, fn: () => void): void {
  const previousSuite = currentSuite;
  currentSuite = name;
  if (!registeredSuites.has(name)) {
    registeredSuites.set(name, []);
  }
  fn();
  currentSuite = previousSuite;
}

export function test(name: string, fn: () => void | Promise<void>): void {
  const suiteList = registeredSuites.get(currentSuite) || [];
  suiteList.push({ name, fn });
  registeredSuites.set(currentSuite, suiteList);
}

export const it = test;

function recordAssertion(): void {
  totalAssertions++;
}

export function getGlobalAssertionCount(): number {
  return totalAssertions;
}

export function resetGlobalAssertionCount(): void {
  totalAssertions = 0;
}

export class Expectation {
  private actual: any;
  private isNot: boolean;

  constructor(actual: any, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not(): Expectation {
    return new Expectation(this.actual, !this.isNot);
  }

  private evaluate(condition: boolean, message: string): void {
    recordAssertion();
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      const formattedMessage = this.isNot
        ? `Expected NOT ${message}, but condition was true. Actual: ${JSON.stringify(this.actual)}`
        : `Expected ${message}. Actual: ${JSON.stringify(this.actual)}`;
      throw new Error(formattedMessage);
    }
  }

  toBe(expected: any): void {
    this.evaluate(Object.is(this.actual, expected), `to be ${JSON.stringify(expected)}`);
  }

  toEqual(expected: any): void {
    const isDeepEqual = (a: any, b: any): boolean => {
      if (Object.is(a, b)) return true;
      if (a === null || typeof a !== "object" || b === null || typeof b !== "object") return false;
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (!keysB.includes(key) || !isDeepEqual(a[key], b[key])) return false;
      }
      return true;
    };
    this.evaluate(isDeepEqual(this.actual, expected), `to deeply equal ${JSON.stringify(expected)}`);
  }

  toBeCloseTo(expected: number, numDigits = 2): void {
    if (typeof this.actual !== "number" || typeof expected !== "number") {
      this.evaluate(false, `numeric closeTo comparison between ${typeof this.actual} and ${typeof expected}`);
      return;
    }
    const diff = Math.abs(this.actual - expected);
    const tolerance = Math.pow(10, -numDigits) / 2;
    this.evaluate(diff <= tolerance, `to be within ${tolerance} of ${expected} (difference was ${diff})`);
  }

  toBeGreaterThan(expected: number): void {
    this.evaluate(this.actual > expected, `to be greater than ${expected}`);
  }

  toBeGreaterThanOrEqual(expected: number): void {
    this.evaluate(this.actual >= expected, `to be greater than or equal to ${expected}`);
  }

  toBeLessThan(expected: number): void {
    this.evaluate(this.actual < expected, `to be less than ${expected}`);
  }

  toBeLessThanOrEqual(expected: number): void {
    this.evaluate(this.actual <= expected, `to be less than or equal to ${expected}`);
  }

  toContain(expected: any): void {
    if (typeof this.actual === "string") {
      this.evaluate(this.actual.includes(String(expected)), `string to contain "${expected}"`);
    } else if (Array.isArray(this.actual)) {
      const found = this.actual.some((item) => Object.is(item, expected) || JSON.stringify(item) === JSON.stringify(expected));
      this.evaluate(found, `array to contain ${JSON.stringify(expected)}`);
    } else if (this.actual instanceof Set || this.actual instanceof Map) {
      this.evaluate(this.actual.has(expected), `collection to have key ${expected}`);
    } else {
      this.evaluate(false, `toContain called on non-collection type: ${typeof this.actual}`);
    }
  }

  toMatch(regex: RegExp | string): void {
    const re = typeof regex === "string" ? new RegExp(regex) : regex;
    this.evaluate(typeof this.actual === "string" && re.test(this.actual), `to match regex ${re.toString()}`);
  }

  toBeDefined(): void {
    this.evaluate(this.actual !== undefined, "to be defined");
  }

  toBeUndefined(): void {
    this.evaluate(this.actual === undefined, "to be undefined");
  }

  toBeNull(): void {
    this.evaluate(this.actual === null, "to be null");
  }

  toBeTruthy(): void {
    this.evaluate(Boolean(this.actual), "to be truthy");
  }

  toBeFalsy(): void {
    this.evaluate(!this.actual, "to be falsy");
  }

  toThrow(expectedErrorPattern?: string | RegExp): void {
    if (typeof this.actual !== "function") {
      this.evaluate(false, "toThrow called on non-function target");
      return;
    }
    let threw = false;
    let thrownError: any = null;
    try {
      this.actual();
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }

    if (!expectedErrorPattern) {
      this.evaluate(threw, "function to throw an error");
      return;
    }

    if (!threw) {
      this.evaluate(false, `function to throw error matching ${expectedErrorPattern}, but it did not throw`);
      return;
    }

    const message = thrownError?.message || String(thrownError);
    if (expectedErrorPattern instanceof RegExp) {
      this.evaluate(expectedErrorPattern.test(message), `error message "${message}" to match regex ${expectedErrorPattern}`);
    } else {
      this.evaluate(message.includes(expectedErrorPattern), `error message "${message}" to contain "${expectedErrorPattern}"`);
    }
  }
}

export function expect(actual: any): Expectation {
  return new Expectation(actual);
}

export async function executeSuites(filterSuite?: string): Promise<{
  suites: SuiteStats[];
  totalPass: number;
  totalFail: number;
  totalAssertions: number;
  totalDurationMs: number;
}> {
  const suitesOutput: SuiteStats[] = [];
  let totalPass = 0;
  let totalFail = 0;
  const startGlobalTime = Date.now();

  for (const [suiteName, tests] of registeredSuites.entries()) {
    if (filterSuite && !suiteName.toLowerCase().includes(filterSuite.toLowerCase())) {
      continue;
    }

    const suiteStart = Date.now();
    const suiteResult: SuiteStats = {
      suiteName,
      tests: [],
      passCount: 0,
      failCount: 0,
      assertionCount: 0,
      durationMs: 0,
    };

    const initialAssertionCount = totalAssertions;

    for (const testCase of tests) {
      const testStart = Date.now();
      try {
        await testCase.fn();
        const duration = Date.now() - testStart;
        suiteResult.tests.push({
          suite: suiteName,
          name: testCase.name,
          passed: true,
          durationMs: duration,
        });
        suiteResult.passCount++;
        totalPass++;
      } catch (err: any) {
        const duration = Date.now() - testStart;
        suiteResult.tests.push({
          suite: suiteName,
          name: testCase.name,
          passed: false,
          error: err,
          durationMs: duration,
        });
        suiteResult.failCount++;
        totalFail++;
      }
    }

    suiteResult.durationMs = Date.now() - suiteStart;
    suiteResult.assertionCount = totalAssertions - initialAssertionCount;
    suitesOutput.push(suiteResult);
  }

  const totalDurationMs = Date.now() - startGlobalTime;

  return {
    suites: suitesOutput,
    totalPass,
    totalFail,
    totalAssertions,
    totalDurationMs,
  };
}
