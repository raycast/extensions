import { describe, expect, it } from "vitest";
import { DEMO_ANNOTATIONS, DEMO_FAILING_JOB_ID, DEMO_LOG, demoJob, demoLog, demoQueue } from "../src/lib/demo";
import { excerptAround, failureLineInStep, summarizeLog } from "../src/lib/logs";
import {
  buildCopyText,
  buildJobMarkdown,
  buildPreviewMarkdown,
  failedStep,
  failureErrors,
  failureUrl,
  keyErrors,
} from "../src/lib/report";

const ts = (line: string) => `2026-10-07T14:00:00.0000000Z ${line}`;

describe("summarizeLog with Playwright", () => {
  const summary = summarizeLog(DEMO_LOG);

  it("lists failed and flaky tests from the summary", () => {
    expect(summary.failedTests).toEqual(["[chromium] › refunds.spec.ts:31:3 › partial refund rounds to the cent"]);
    expect(summary.flakyTests).toEqual(["[chromium] › cart.spec.ts:88:5 › applies a gift card after a coupon"]);
  });

  it("keeps the totals", () => expect(summary.testTotals).toEqual(["1 failed", "1 flaky", "210 passed (9.4m)"]));

  it("names the failing step", () => expect(summary.failingStep).toBe("npx playwright test --project=chromium"));

  it("starts the excerpt at the first failure and drops timestamps", () => {
    expect(summary.excerpt[0]).toMatch(/^\s+1\) \[chromium\]/);
    expect(summary.excerpt.some((line) => /^\d{4}-\d{2}-\d{2}T/.test(line))).toBe(false);
  });

  it("ignores the exit code line as an error", () =>
    expect(summary.errors.some((error) => /exit code/.test(error.text))).toBe(false));
});

describe("summarizeLog with Vitest", () => {
  const log = [
    ts("##[group]Run npm test"),
    ts("npm test"),
    ts("##[endgroup]"),
    ts(" FAIL  src/cart.test.ts > applies coupons"),
    ts("AssertionError: expected 3 to be 2"),
    ts(" Test Files  1 failed | 41 passed (42)"),
    ts("      Tests  1 failed | 380 passed (381)"),
    ts("##[error]Process completed with exit code 1."),
  ].join("\n");
  const summary = summarizeLog(log);

  it("lists failing tests", () => expect(summary.failedTests).toEqual(["src/cart.test.ts > applies coupons"]));
  it("keeps the totals", () =>
    expect(summary.testTotals).toEqual(["Test Files 1 failed | 41 passed (42)", "Tests 1 failed | 380 passed (381)"]));
  it("names the failing step", () => expect(summary.failingStep).toBe("npm test"));
});

describe("summarizeLog with plain errors", () => {
  it("collects ##[error] lines and strips ANSI colors", () => {
    const log = [
      ts("##[group]Run npm run typecheck"),
      ts("##[endgroup]"),
      ts("\u001b[31msrc/a.ts(3,1): error TS2304\u001b[0m"),
      ts("##[error]src/a.ts(3,1): error TS2304: Cannot find name 'x'."),
      ts("##[error]Process completed with exit code 2."),
    ].join("\n");
    const summary = summarizeLog(log);
    expect(summary.errors.filter((error) => error.fromRunner)).toEqual([
      {
        text: "src/a.ts(3,1): error TS2304: Cannot find name 'x'.",
        message: "error TS2304: Cannot find name 'x'.",
        path: "src/a.ts",
        line: 3,
        fromRunner: true,
      },
    ]);
    expect(summary.excerpt).toContain("src/a.ts(3,1): error TS2304");
  });
});

describe("excerptAround", () => {
  const excerpt = Array.from({ length: 80 }, (_, index) => `line ${index}`);
  it("starts a little before the error", () =>
    expect(excerptAround({ excerpt, excerptFocus: 40 }, 25)[0]).toBe("line 32"));
  it("starts at a test failure header", () =>
    expect(excerptAround({ excerpt, excerptFocus: 0 }, 25)[0]).toBe("line 0"));
  it("shows the end when the failure is the exit", () =>
    expect(excerptAround({ excerpt, excerptFocus: 80 }, 25).at(-1)).toBe("line 79"));
});

describe("failureLineInStep, GitHub's line numbers inside a step", () => {
  const at = (time: string, line: string) => `2026-10-07T${time}.1234567Z ${line}`;

  it("counts from the step's Run line and skips ##[endgroup]", () => {
    const log = [
      at("17:45:20", "##[group]Run yarn install"),
      at("17:45:20", "##[endgroup]"),
      at("17:45:31", "done"),
      at("17:45:31", "##[end-action id=x;outcome=success]"),
      at("17:45:32", "##[group]Run yarn test:js"),
      at("17:45:32", "yarn test:js"),
      at("17:45:32", "shell: /usr/bin/bash -e {0}"),
      at("17:45:32", "##[endgroup]"),
      at("17:45:40", "output"),
      at("17:46:01", "##[error]AssertionError: expected 1 to be 2"),
      at("17:46:01", "##[error]Process completed with exit code 1."),
    ].join("\n");
    expect(failureLineInStep(log, { name: "JavaScript testing", startedAt: "2026-10-07T17:45:32Z" })).toBe(5);
  });

  it("starts at the debug line when step debugging is on", () => {
    const log = [
      at("22:03:21", "##[debug]Finishing: Previous step"),
      at("22:03:22", "##[debug]Evaluating condition for step: 'Run Analyze'"),
      at("22:03:22", "##[debug]Starting: Run Analyze"),
      at("22:03:22", "##[group]Run analyze"),
      at("22:03:22", "analyze"),
      at("22:03:22", "##[endgroup]"),
      at("22:08:09", "Analysis failed."),
      at("22:08:09", "##[error]Process completed with exit code 1."),
    ].join("\n");
    expect(failureLineInStep(log, { name: "Run Analyze", startedAt: "2026-10-07T22:03:22Z" })).toBe(6);
  });

  it("starts at a composite step's first group, not the one that failed", () => {
    const log = [
      at("10:00:00", "##[group]Run setup"),
      at("10:00:00", "##[endgroup]"),
      at("10:00:05", "##[group]Run first part"),
      at("10:00:05", "##[endgroup]"),
      at("10:00:06", "ok"),
      at("10:00:07", "##[group]Run second part"),
      at("10:00:07", "##[endgroup]"),
      at("10:00:08", "##[error]boom"),
      at("10:00:08", "##[error]Process completed with exit code 1."),
    ].join("\n");
    expect(failureLineInStep(log, { name: "Build", startedAt: "2026-10-07T10:00:05Z" })).toBe(4);
  });
});

describe("job report", () => {
  const job = demoJob(DEMO_FAILING_JOB_ID, new Date("2026-10-07T14:30:00Z"));
  const summary = summarizeLog(DEMO_LOG, { step: { name: "Run Playwright" } });
  const check = { name: "e2e (chromium)", state: "failure" as const, required: true, jobId: 9100, runId: 16100 };
  const input = {
    check,
    pr: { number: 4815, title: "Fix currency rounding", url: "https://github.com/acme/storefront/pull/4815" },
    job,
    annotations: DEMO_ANNOTATIONS,
    log: { status: "loaded" as const, summary },
    repo: "acme/storefront",
    sha: "abc123",
  };

  it("links annotation errors to the file and line at the queued commit", () =>
    expect(failureErrors(input)[0]).toEqual({
      location: "e2e/refunds.spec.ts:48",
      url: "https://github.com/acme/storefront/blob/abc123/e2e/refunds.spec.ts#L48",
      text: 'Expected "$12.35", received "$12.34"',
    }));

  it("reads key errors as location: message", () =>
    expect(keyErrors(input)[0]).toMatch(/^e2e\/refunds\.spec\.ts:48: /));

  it("links straight to the failing line in the failed step", () =>
    expect(failureUrl(job, input.log)).toBe(
      `https://github.com/acme/storefront/actions/runs/16100/job/9100#step:5:${summary.failureLine}`,
    ));

  it("keeps the preview to errors, tests and the end of the log", () => {
    const preview = buildPreviewMarkdown(input);
    expect(preview).toContain("[`e2e/refunds.spec.ts:48`](https://github.com/acme/storefront/blob/abc123/");
    expect(preview).toContain("**Failed Tests**");
    expect(preview).toContain('Expected: "$12.35"');
    expect(preview).not.toContain("## Steps");
  });

  it("shows only the steps that didn't pass in the full report", () => {
    const markdown = buildJobMarkdown(input);
    expect(markdown).toContain("**Run Playwright** · failure");
    expect(markdown).toContain("6 other steps passed or skipped");
    expect(markdown).not.toContain("Check out code");
  });

  it("shows a running job's steps with the current one in bold", () => {
    const now = new Date("2026-10-07T14:30:00Z");
    const running = demoQueue(
      now,
    ).repository!.mergeQueue!.entries.nodes[0].headCommit!.statusCheckRollup!.contexts.nodes.find(
      (node) => node && "name" in node && node.name === "lighthouse",
    ) as { databaseId: number };
    const job = demoJob(running.databaseId, now);
    const preview = buildPreviewMarkdown({
      check: { name: "lighthouse", state: "pending", required: false, jobId: running.databaseId },
      job,
      log: { status: "unavailable", reason: "running" },
    });
    expect(preview).toMatch(/^Running · .+ · step 4 of 6\n/);
    expect(preview).toContain("✓ Install dependencies");
    expect(preview).toContain("◐ **Run tests**");
    expect(preview).toContain("○ Upload results");
    expect(failureUrl(job, { status: "idle" })).toBe(`${job.htmlUrl}#step:4:1`);
  });

  it("gives each demo check its own job, so a passing one never shows a failure", () => {
    expect(failedStep(demoJob(9103))?.name).toBe("Audit dependencies");
    expect(summarizeLog(demoLog(9103)).errors.map((error) => error.text)).toEqual([
      "npm audit found 1 high severity vulnerability (image-size <1.2.1)",
    ]);
    expect(demoJob(9003).conclusion).toBe("success");
    expect(failedStep(demoJob(9003))).toBeUndefined();
  });

  it("says a passing check passed, without loading anything", () =>
    expect(
      buildPreviewMarkdown({
        check: {
          name: "lint",
          state: "success",
          required: true,
          startedAt: "2026-10-07T14:00:00Z",
          completedAt: "2026-10-07T14:02:00Z",
        },
        log: { status: "idle" },
      }),
    ).toBe("Passed · 2m"));

  it("copies a summary with the failure link for pasting into chat", () => {
    const text = buildCopyText(input);
    expect(text.split("\n")[0]).toBe("e2e (chromium) failed on PR #4815 (Fix currency rounding)");
    expect(text).toContain("Failure: https://github.com/acme/storefront/actions/runs/16100/job/9100#step:5:");
    expect(text).toContain("Flaky tests:");
  });
});
