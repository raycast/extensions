import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { excerptAround, findLocation, fingerprint, logFingerprints, summarizeLog } from "../src/lib/logs";
import { failureErrors } from "../src/lib/report";

const FIXTURES = join(process.cwd(), "test/fixtures/logs");

function fixture(name: string) {
  const raw = readFileSync(join(FIXTURES, `${name}.log`), "utf8");
  const passing = new Set(logFingerprints(readFileSync(join(FIXTURES, `${name}.passing.log`), "utf8")));
  return { raw, alone: summarizeLog(raw), compared: summarizeLog(raw, { passing }) };
}

const texts = (summary: ReturnType<typeof summarizeLog>, count = 3) =>
  summary.errors.slice(0, count).map((error) => error.text);

type Case = {
  fixture: string;
  error: string;
  previewLine?: string;
  location?: string;
  failedTest?: string;
  needsPassingRun?: boolean;
};

const CASES: Case[] = [
  {
    fixture: "jest_typescript",
    error: "has no exported member 'initSync'",
    location: "packages/jest-runtime/src/internals/esmLexer.ts:8",
  },
  {
    fixture: "tsc_without_matcher",
    error: "error TS2307: Cannot find module './values'",
    location: "crates/next-custom-transforms/tests/fixture/server-actions/server-graph/turbopack/cache-closure/input.tsx:1",
  },
  { fixture: "mypy", error: "error: Incompatible types in assignment", location: "src/flask/app.py:206" },
  { fixture: "cargo_publish", error: "error[E0277]: the trait bound", location: "src/types/overrides.rs:887" },
  {
    fixture: "clippy",
    error: "error[E0432]: unresolved import `mio::IoSource`",
    location: "tokio/src/process/unix/mod.rs:40",
  },
  {
    fixture: "pytest_timeout",
    error: "Failed: Timeout (>5.0s) from pytest-timeout.",
    failedTest: "test_multi_host_url_linear_time[slashes]",
  },
  {
    fixture: "rspec",
    error: "Failure/Error: expect(runtime.uncorrected_offenses",
    previewLine: "expect(runtime.uncorrected_offenses",
    failedTest:
      "./spec/rubocop/lsp/runtime_spec.rb:52 # RuboCop::LSP::Runtime#uncorrected_offenses lists what the last format left, located in the source it returned",
  },
  { fixture: "gradle", error: "Error: unexpected EOF" },
  {
    fixture: "go_disk_full",
    error: "There is not enough space on the disk.",
    failedTest: "github.com/gohugoio/hugo/resources/resource [build failed]",
  },
  {
    fixture: "go_timeout",
    error: "panic: test timed out after 10m0s",
    failedTest: "TestChunkQuerierReadWriteRace_AppendV2",
  },
  { fixture: "electron_hang", error: "CodeWindow: detected unresponsive", needsPassingRun: true },
];

describe("finds the failure in real CI logs without knowing the framework", () => {
  for (const testCase of CASES) {
    describe(testCase.fixture, () => {
      const { alone, compared } = fixture(testCase.fixture);

      it("puts the real error among the first three", () => {
        expect(texts(compared).some((text) => text.includes(testCase.error))).toBe(true);
        if (!testCase.needsPassingRun) {
          expect(texts(alone).some((text) => text.includes(testCase.error))).toBe(true);
        }
      });

      it("shows the error in the preview", () =>
        expect(
          excerptAround(compared, 25).some((line) => line.includes(testCase.previewLine ?? testCase.error)),
        ).toBe(true));

      if (testCase.location) {
        it("reads the file and line", () => {
          const error = compared.errors.find((found) => found.text.includes(testCase.error));
          expect(`${error?.path}:${error?.line}`).toBe(testCase.location);
        });
      }

      if (testCase.failedTest) {
        it("names the failed test", () => expect(compared.failedTests).toContain(testCase.failedTest));
      }
    });
  }
});

describe("comparing with the last passing run", () => {
  it("drops errors the passing run printed too", () => {
    const { alone, compared } = fixture("electron_hang");
    expect(texts(alone).some((text) => text.includes("Failed to connect to the bus"))).toBe(true);
    expect(compared.errors.some((error) => error.text.includes("Failed to connect to the bus"))).toBe(false);
  });

  it("collapses the output both runs share", () => {
    const { compared } = fixture("go_disk_full");
    expect(compared.excerpt.some((line) => /^⋯ \d+ lines also in the last passing run$/.test(line))).toBe(true);
    expect(compared.comparedWithPassingRun).toBe(true);
  });

  it("keeps test totals even when the passing run printed the same shape", () =>
    expect(fixture("rspec").compared.testTotals).toEqual(["38001 examples, 4 failures, 8 pending"]));

  it("never hides a line that mentions failures, even if the passing run had one like it", () => {
    const log = [
      "##[group]Run rspec",
      "##[endgroup]",
      "Randomized with seed 1",
      "Finished in 3 minutes",
      "Loaded 12 files",
      "38001 examples, 4 failures, 8 pending",
      "##[error]Process completed with exit code 1.",
    ].join("\n");
    const passing = new Set(logFingerprints(["Randomized with seed 9", "Finished in 2 minutes", "Loaded 12 files", "38005 examples, 0 failures, 8 pending"].join("\n")));
    expect(summarizeLog(log, { passing }).excerpt).toEqual(["⋯ 3 lines also in the last passing run", "38001 examples, 4 failures, 8 pending"]);
  });

  it("leaves the log alone without a passing run", () => {
    const { alone } = fixture("go_disk_full");
    expect(alone.excerpt.some((line) => line.startsWith("⋯"))).toBe(false);
    expect(alone.comparedWithPassingRun).toBe(false);
  });
});

describe("noise", () => {
  it("skips RSpec's pending failures once the real failures start", () =>
    expect(fixture("rspec").alone.errors.some((error) => error.text.includes("expect(new_source)"))).toBe(false));

  it("skips build-tool wrap-up lines", () => {
    const errors = [...fixture("gradle").alone.errors, ...fixture("go_disk_full").alone.errors].map((error) =>
      error.text.trim(),
    );
    expect(errors).not.toContain("FAIL");
    expect(errors.some((text) => text.startsWith("BUILD FAILED in"))).toBe(false);
    expect(errors.some((text) => text.includes("could not compile"))).toBe(false);
  });

  it("joins a heading that ends in a colon with its next line", () =>
    expect(fixture("rspec").compared.errors[0].text).toMatch(/^Failure\/Error: expect\(/));
});

describe("findLocation", () => {
  it("strips the runner's checkout folder", () =>
    expect(findLocation("/home/runner/work/app/app/src/a.ts:12:3 - error")?.path).toBe("src/a.ts"));
  it("handles Windows runners", () =>
    expect(findLocation("D:\\a\\app\\app\\src\\a.cs(4,2): error CS1002")?.path).toBe("src/a.cs"));
  it("reads Python tracebacks", () =>
    expect(findLocation('  File "/home/runner/work/app/app/pkg/mod.py", line 9, in run')).toMatchObject({
      path: "pkg/mod.py",
      line: 9,
    }));
  it("ignores dependencies", () =>
    expect(findLocation("    at f (/home/runner/work/app/app/node_modules/x/index.js:1:2)")).toBeUndefined());
  it("ignores URLs", () => expect(findLocation("GET https://example.com:8080/a.js")).toBeUndefined());
  it("ignores paths outside the checkout", () =>
    expect(findLocation("/usr/lib/python3.12/json/decoder.py:337")).toBeUndefined());
  it("doesn't read a log level as a drive letter", () =>
    expect(findLocation("[4003:1008/171957.931886:ERROR:dbus/bus.cc:406] Failed")?.path).toBe("dbus/bus.cc"));
});

describe("failed test names", () => {
  const failedFrom = (...lines: string[]) =>
    summarizeLog(
      ["##[group]Run tests", "##[endgroup]", ...lines, "##[error]Process completed with exit code 1."].join("\n"),
    ).failedTests;

  it("reads Go", () => expect(failedFrom("--- FAIL: TestRefund (0.01s)")).toEqual(["TestRefund"]));
  it("reads pytest's summary", () =>
    expect(failedFrom("FAILED tests/test_cart.py::test_coupon - AssertionError: 3 != 2")).toEqual([
      "tests/test_cart.py::test_coupon",
    ]));
  it("reads Cargo", () => expect(failedFrom("test cart::coupon ... FAILED")).toEqual(["cart::coupon"]));
  it("reads Gradle", () =>
    expect(failedFrom("CartTest > appliesCoupon() FAILED")).toEqual(["CartTest > appliesCoupon()"]));
  it("reads .NET", () => expect(failedFrom("  Failed Cart.AppliesCoupon [12 ms]")).toEqual(["Cart.AppliesCoupon"]));
  it("reads Jest's marks", () =>
    expect(failedFrom("    ✕ applies coupons (5 ms)")).toEqual(["applies coupons"]));
  it("reads Jest's file line", () =>
    expect(failedFrom("FAIL src/cart.test.ts (5.1 s)")).toEqual(["src/cart.test.ts"]));
  it("ignores Gradle task lines", () => expect(failedFrom("> Task :app:test FAILED")).toEqual([]));
});

describe("fingerprint", () => {
  it("ignores timestamps, numbers and hashes", () =>
    expect(fingerprint("2026-10-08T17:19:54.1Z ok  pkg/a 0.41s (sha 3f9a2c1d)")).toBe(
      fingerprint("2026-09-01T01:02:03.4Z ok  pkg/a 12.7s (sha 77ab01ef)"),
    ));
  it("still tells different lines apart", () =>
    expect(fingerprint("ok pkg/a")).not.toBe(fingerprint("FAIL pkg/a")));
});

describe("linking errors found in the log", () => {
  const log = (inRepo: boolean) => ({
    status: "loaded" as const,
    summary: {
      ...summarizeLog("src/a.py:3: error: bad"),
      errors: [{ text: "src/a.py:3: error: bad", message: "error: bad", path: "src/a.py", line: 3, fromRunner: false, inRepo }],
    },
  });

  it("links a file GitHub confirmed exists at the commit", () =>
    expect(failureErrors({ log: log(true), repo: "acme/app", sha: "abc" })).toEqual([
      { text: "error: bad", location: "src/a.py:3", url: "https://github.com/acme/app/blob/abc/src/a.py#L3" },
    ]));

  it("shows the line as-is when the file isn't in the repo", () =>
    expect(failureErrors({ log: log(false), repo: "acme/app", sha: "abc" })).toEqual([
      { text: "src/a.py:3: error: bad" },
    ]));

  it("prefers annotations over guesses from the log", () =>
    expect(
      failureErrors({
        log: log(true),
        annotations: [{ level: "failure", path: "src/b.py", line: 1, message: "real problem" }],
      }).map((error) => error.text),
    ).toEqual(["real problem"]));
});
