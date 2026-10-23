import { afterEach, describe, expect, it } from "vitest";
import { describeError } from "../src/lib/presentation";
import { elapsedSeconds, formatClock, formatDuration } from "../src/lib/format";
import { translator } from "../src/lib/i18n";
import {
  byId,
  describeEntry,
  describeTarget,
  recentTargets,
  rememberTarget,
  startTimerFor,
  workableProjects,
} from "../src/lib/timer";
import { harness, toolCalls, type Harness } from "./helpers";

let current: Harness | undefined;
afterEach(() => current?.client.close());

describe("Start Timer", () => {
  it("starts an approved timer for a project and returns the running entry", async () => {
    const h = (current = harness("timer-start.json"));
    const entry = await startTimerFor(h.api, { projectId: "P-WEB" }, "  Startseite  ", false);
    expect(entry.is_running).toBe(true);
    const [call] = toolCalls(h, "time_start_timer");
    expect(call.params?.arguments).toEqual({ project_id: "P-WEB", note: "Startseite", status: "approved" });
  });

  it("sends the customer only when there is no project", async () => {
    const h = (current = harness("timer-start.json"));
    await startTimerFor(h.api, { customerId: "C-SONNE" }, undefined, false).catch(() => undefined);
    const [call] = toolCalls(h, "time_start_timer");
    expect(call.params?.arguments).toEqual({ customer_id: "C-SONNE", status: "approved" });
  });

  it("orders recent targets: local first, then Folnaro's latest entries, each once", async () => {
    const h = (current = harness("demo.json"));
    const [projects, customers, entries] = await Promise.all([
      h.api.projects(),
      h.api.customers({ limit: 500 }),
      h.api.timeEntries(),
    ]);
    const known = { projects: byId(workableProjects(projects)), customers: byId(customers) };
    const recents = recentTargets([{ projectId: "P-BRAND", activity: "Konzept" }, { projectId: "P-OLD" }], entries, known);
    expect(recents.map((target) => describeTarget(target, known).title)).toEqual([
      "Markenauftritt 2027",
      "App-Prototyp",
      "Website-Relaunch",
      "Café Sonnendeck",
    ]);
    expect(describeTarget(recents[2], known).subtitle).toBe("Design · Nordlicht Medien GmbH");
    expect(rememberTarget(recents, recents[3])[0]).toEqual(recents[3]);
  });

  it("refuses a second timer with a calm explanation", async () => {
    const h = (current = harness("timer-already-running.json"));
    const error = await startTimerFor(h.api, { projectId: "P-WEB" }, undefined, false).catch((failure) => failure);
    expect(error.kind).toBe("timerRunning");
    expect(describeError(error, translator("de")).title).toBe("Es läuft schon ein Timer");
  });
});

describe("Stop Timer", () => {
  it("stops the running timer and names its project", async () => {
    const h = (current = harness("timer-stop.json"));
    const entry = await h.api.stopTimer();
    expect(entry.duration_seconds).toBe(5700);
    expect(formatDuration(entry.duration_seconds, "de")).toBe("1:35 h");
    const known = { projects: byId(await h.api.projects()), customers: byId(await h.api.customers()) };
    expect(describeEntry(entry, known)).toBe("Website-Relaunch");
  });

  it("says when no timer runs, in English and German", async () => {
    const h = (current = harness("timer-stop.json"));
    await h.api.stopTimer();
    await expect(h.api.stopTimer()).rejects.toMatchObject({ kind: "timerNotRunning" });
    const de = harness("timer-not-running-de.json");
    const error = await de.api.stopTimer().catch((failure) => failure);
    de.client.close();
    expect(error.kind).toBe("timerNotRunning");
    expect(describeError(error, translator("de")).title).toBe("Gerade läuft kein Timer");
  });
});

describe("Running Timer", () => {
  it("computes the elapsed time from started_at", async () => {
    const h = (current = harness("demo.json"));
    const entry = (await h.api.runningTimer())!;
    expect(entry.is_running).toBe(true);
    const now = new Date("2026-10-09T10:59:30+02:00");
    expect(formatClock(elapsedSeconds(entry, now))).toBe("1:47");
  });

  it("falls back to duration_seconds without a start time", () => {
    expect(
      elapsedSeconds({ id: "x", date: "2026-10-09", duration_seconds: 125, is_running: true, is_billable: true }),
    ).toBe(125);
  });
});
