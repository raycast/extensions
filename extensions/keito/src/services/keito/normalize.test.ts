import { mkdtempSync, readFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { buildLookup } from "./api";
import {
  Favorite,
  favoriteAvailability,
  favoritesKey,
  normalizeFavoriteHours,
  parseFavorites,
  upsertFavorite,
} from "./favorites";
import { entryEditability, formatHours, normalizeIdentity, normalizeTimeEntry } from "./normalize";
import { identityScope } from "./session";
import { STATUS_FILE_SCHEMA, syncStatusFile } from "./statusFile";
import { fullAccessMe, makeApi, rawEntry, readOnlyMe, TEST_ACCOUNT, TEST_TOKEN } from "./testUtils";

describe("identity (onboarding)", () => {
  it("accepts a full-access key whose company matches the Company ID", () => {
    expect(normalizeIdentity(fullAccessMe, TEST_ACCOUNT, ["timer-stop"])).toEqual({
      userId: "cmuser0001",
      name: "Ada Lovelace",
      email: "ada@example.com",
      roles: ["member"],
      userType: "human",
      companyId: TEST_ACCOUNT,
      companyName: "Acme Consulting",
      credentialType: "full_access",
      features: ["timer-stop"],
      settings: { requireNotes: false },
    });
  });

  it("explains that a personal read-only sync key cannot track time", () => {
    expect(() => normalizeIdentity(readOnlyMe, TEST_ACCOUNT)).toThrow(
      expect.objectContaining({ kind: "read_only_key", message: expect.stringMatching(/Administrator.*full-access/) }),
    );
  });

  it("rejects a key that resolves to another company", () => {
    expect(() => normalizeIdentity({ ...fullAccessMe, company: { id: "cmother" } }, TEST_ACCOUNT)).toThrow(
      expect.objectContaining({ kind: "company_mismatch" }),
    );
  });

  it("rejects responses without a user or company, and coerces numeric IDs", () => {
    expect(() => normalizeIdentity({}, TEST_ACCOUNT)).toThrow(expect.objectContaining({ kind: "unexpected_response" }));
    expect(() => normalizeIdentity({ id: "u" }, TEST_ACCOUNT)).toThrow(
      expect.objectContaining({ kind: "unexpected_response" }),
    );
    expect(normalizeIdentity({ id: 42, company: { id: 7 } }, "7")).toMatchObject({ userId: "42", companyId: "7" });
  });

  it("verifies end to end through GET /users/me", async () => {
    const ok = makeApi({
      "GET /api/v2/users/me": { body: fullAccessMe, headers: { "X-Keito-Features": "timer-restart" } },
    });
    expect(await ok.api.getIdentity()).toMatchObject({ companyName: "Acme Consulting", features: ["timer-restart"] });

    const readOnly = makeApi({ "GET /api/v2/users/me": { body: readOnlyMe } });
    await expect(readOnly.api.getIdentity()).rejects.toMatchObject({ kind: "read_only_key", isSetupProblem: true });

    const revoked = makeApi({ "GET /api/v2/users/me": { status: 401, body: { error: "invalid_token" } } });
    const error = await revoked.api.getIdentity().catch((e) => e);
    expect(error).toMatchObject({ kind: "invalid_credentials", isSetupProblem: true });
    expect(error.message).not.toContain(TEST_TOKEN);
  });
});

describe("time entry normalization", () => {
  it("reads nested Harvest-compatible objects", () => {
    expect(normalizeTimeEntry(rawEntry())).toMatchObject({
      id: "cmentry0001",
      projectId: "cmproject0001",
      projectName: "Website",
      projectCode: "WEB",
      taskName: "Development",
      clientName: "Acme",
      hours: 1.5,
      startedTime: "09:00",
      approvalStatus: "unsubmitted",
    });
  });

  it("reads flat IDs and fills names from discovered projects and tasks", () => {
    const flat = {
      id: 5,
      project_id: 10,
      task_id: "cmt",
      spent_date: "2026-10-15",
      hours: "0.25",
      notes: null,
      is_running: true,
      timer_started_at: "2026-10-15T09:00:00Z",
    };
    const entry = normalizeTimeEntry(
      flat,
      buildLookup([{ id: "10", name: "Mobile", clientId: "c1", clientName: "Beta" }], [{ id: "cmt", name: "QA" }]),
    );
    expect(entry).toMatchObject({
      id: "5",
      projectId: "10",
      projectName: "Mobile",
      taskName: "QA",
      clientName: "Beta",
      hours: 0.25,
      notes: "",
      isRunning: true,
    });
  });

  it("derives hours from duration_seconds and rejects entries without IDs", () => {
    expect(normalizeTimeEntry({ id: "e", project_id: "p", task_id: "t", duration_seconds: 5400 }).hours).toBe(1.5);
    expect(() => normalizeTimeEntry({ id: "e", project_id: "p" })).toThrow(
      expect.objectContaining({ kind: "unexpected_response" }),
    );
  });

  it("keeps the documented external reference fields", () => {
    const entry = normalizeTimeEntry(
      rawEntry({
        external_reference: {
          id: 123,
          permalink: "https://t.example/123",
          service: "t.example",
          service_name: "Tracker",
        },
      }),
    );
    expect(entry.externalReference).toEqual(
      expect.objectContaining({ id: "123", permalink: "https://t.example/123", serviceName: "Tracker" }),
    );
  });
});

describe("approval and lock state", () => {
  it("treats Keito-approved time as locked even though is_closed is false", () => {
    const approved = normalizeTimeEntry(rawEntry({ approval_status: "approved", is_locked: true, is_closed: false }));
    expect(entryEditability(approved)).toEqual({
      canEdit: false,
      canDelete: false,
      canRestart: false,
      reason: "Approved time cannot be changed.",
    });
  });

  it("uses locked_reason, honors Harvest-closed time, and leaves submitted time to the server", () => {
    expect(entryEditability(normalizeTimeEntry(rawEntry({ is_locked: true, locked_reason: "Invoiced" }))).reason).toBe(
      "Invoiced",
    );
    expect(entryEditability(normalizeTimeEntry(rawEntry({ is_closed: true }))).canEdit).toBe(false);
    expect(entryEditability(normalizeTimeEntry(rawEntry({ approval_status: "submitted" }))).canEdit).toBe(true);
    expect(entryEditability(normalizeTimeEntry(rawEntry({ approval_status: "rejected" }))).canEdit).toBe(true);
  });
});

describe("formatHours", () => {
  it.each([
    [1.5, "hours_minutes", "1:30"],
    [0.3333, "hours_minutes", "0:20"],
    [1.999, "hours_minutes", "2:00"],
    [1.5, "decimal", "1.50"],
  ])("%s as %s is %s", (hours, format, expected) => {
    expect(formatHours(hours, format)).toBe(expected);
  });
});

describe("favorites", () => {
  const favorite: Favorite = { id: "1", projectId: "p1", projectName: "Web", taskId: "t1", taskName: "Dev" };

  it("are stored per company and identity", () => {
    const a = favoritesKey(identityScope({ companyId: "c1", userId: "u1" }));
    const b = favoritesKey(identityScope({ companyId: "c2", userId: "u1" }));
    expect(a).toBe("keito:c1:u1:favorites");
    expect(a).not.toBe(b);
  });

  it("parse legacy numeric IDs as strings and drop malformed items", () => {
    const raw = JSON.stringify([
      { id: 1, projectId: 2, taskId: 3, projectName: "P", taskName: "T", clientId: 4, hours: "1.5" },
      { id: "x" },
      null,
    ]);
    expect(parseFavorites(raw)).toEqual([
      {
        id: "1",
        projectId: "2",
        projectName: "P",
        projectCode: undefined,
        taskId: "3",
        taskName: "T",
        clientId: "4",
        clientName: undefined,
        notes: undefined,
        hours: "1.5",
      },
    ]);
    expect(parseFavorites("not json")).toEqual([]);
    expect(parseFavorites(undefined)).toEqual([]);
  });

  it("upsert, normalize durations, and flag unavailable projects", () => {
    expect(upsertFavorite([], favorite)).toEqual({ favorites: [favorite], added: true });
    expect(upsertFavorite([favorite], { ...favorite, notes: "x" }).added).toBe(false);
    expect(normalizeFavoriteHours("1:30")).toBe("1.5");
    expect(normalizeFavoriteHours("20m")).toBe("0.3333");
    expect(normalizeFavoriteHours("")).toBeUndefined();
    expect(normalizeFavoriteHours("abc")).toBeNull();
    expect(favoriteAvailability(favorite, [{ id: "p1", name: "Web" }]).available).toBe(true);
    expect(favoriteAvailability(favorite, [{ id: "p2", name: "Other" }]).available).toBe(false);
    expect(favoriteAvailability(favorite, undefined).available).toBe(true);
  });
});

describe("status folder", () => {
  it("writes a documented payload for the running timer and removes it when stopped", () => {
    const folder = join(mkdtempSync(join(tmpdir(), "keito-status-")), "nested");
    const entry = normalizeTimeEntry(rawEntry({ is_running: true }));
    syncStatusFile(folder, entry, TEST_ACCOUNT);
    const file = join(folder, "currentTimer.json");
    const content = readFileSync(file, "utf8");
    expect(JSON.parse(content)).toMatchObject({
      schema: STATUS_FILE_SCHEMA,
      company_id: TEST_ACCOUNT,
      id: "cmentry0001",
      is_running: true,
      project: { id: "cmproject0001", name: "Website", code: "WEB" },
      task: { id: "cmtask0001", name: "Development" },
    });
    expect(content).not.toContain("kto_");
    syncStatusFile(folder, null, TEST_ACCOUNT);
    expect(existsSync(file)).toBe(false);
    expect(() => syncStatusFile(undefined, entry, TEST_ACCOUNT)).not.toThrow();
  });
});
