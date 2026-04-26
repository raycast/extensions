import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createNoesisCacheRepository } from "./cache";

test("cache repository persists and reloads Selemene snapshots", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "noesis-cache-test-"));
  const databasePath = path.join(tempDir, "cache.sqlite");
  const repository = createNoesisCacheRepository(databasePath);

  repository.saveRemoteSnapshot({
    baseUrl: "https://selemene.tryambakam.space",
    fetchedAt: "2026-04-16T18:30:00Z",
    health: {
      status: "ok",
      version: "3.0.0",
      uptimeSeconds: 42,
      enginesLoaded: 16,
      workflowsLoaded: 6,
      fetchedAt: "2026-04-16T18:30:00Z",
    },
    profile: {
      id: "user-1",
      email: "user@example.com",
      fullName: "Witness User",
      tier: "pro",
      consciousnessLevel: 3,
      experiencePoints: 120,
      birthDate: "1991-08-24",
      birthTime: "03:45:00",
      birthLocation: {
        latitude: 12.9716,
        longitude: 77.5946,
        name: "Bengaluru, India",
      },
      timezone: "Asia/Kolkata",
      preferences: {
        precision: "high",
      },
      fetchedAt: "2026-04-16T18:30:00Z",
    },
    usage: {
      userId: "user-1",
      daily: { total: 3, success: 3, failure: 0 },
      monthly: { total: 12, success: 10, failure: 2 },
      engineBreakdown: [{ engineId: "numerology", requestCount: 4 }],
      fetchedAt: "2026-04-16T18:30:00Z",
    },
    workflows: [
      {
        id: "daily-practice",
        name: "Daily Practice",
        description: "Reflection workflow",
        engineCount: 2,
        engineIds: ["panchanga", "vedic-clock"],
        fetchedAt: "2026-04-16T18:30:00Z",
      },
    ],
    engines: [
      {
        id: "numerology",
        name: "Numerology",
        requiredPhase: 0,
        fetchedAt: "2026-04-16T18:30:00Z",
      },
    ],
    readings: [
      {
        id: "reading-1",
        engineId: "numerology",
        inputHash: "hash-1",
        witnessPrompt: "Notice the pattern.",
        consciousnessLevel: 2,
        calculationTimeMs: 18.5,
        createdAt: "2026-04-16T18:00:00Z",
        payload: { result_data: { life_path: 9 } },
        fetchedAt: "2026-04-16T18:30:00Z",
      },
    ],
    readingStats: [
      { engineId: "numerology", count: 1, fetchedAt: "2026-04-16T18:30:00Z" },
    ],
    rateLimit: {
      limit: 200,
      remaining: 199,
      reset: 1713268800,
    },
    syncIssues: [
      {
        resource: "usage",
        target: "selemene",
        message: "Usage refresh timed out.",
      },
    ],
  });

  repository.saveMenuBarInsights([
    {
      kind: "vedicClock",
      engineId: "vedic-clock",
      title: "Kidney · Kapha",
      subtitle: "5:00 PM - 7:00 PM · Water",
      summary: "Restoration and stillness",
      payload: { result: { current_organ: { organ: "Kidney" } } },
      fetchedAt: "2026-04-16T18:30:00Z",
      refreshAfter: "2026-04-16T19:00:00Z",
    },
  ]);

  const snapshot = repository.readSnapshot(
    "https://selemene.tryambakam.space",
    true,
  );
  const insights = repository.readMenuBarInsights();
  assert.equal(snapshot.baseUrl, "https://selemene.tryambakam.space");
  assert.equal(snapshot.health?.version, "3.0.0");
  assert.equal(snapshot.profile?.fullName, "Witness User");
  assert.equal(snapshot.profile?.birthLocation?.name, "Bengaluru, India");
  assert.equal(snapshot.profile?.preferences.precision, "high");
  assert.equal(snapshot.usage?.engineBreakdown[0]?.requestCount, 4);
  assert.equal(snapshot.workflows[0]?.engineIds[1], "vedic-clock");
  assert.equal(snapshot.engines[0]?.requiredPhase, 0);
  assert.equal(snapshot.readings[0]?.witnessPrompt, "Notice the pattern.");
  assert.equal(snapshot.readingStats[0]?.count, 1);
  assert.equal(snapshot.timestamps.lastSyncAt, "2026-04-16T18:30:00Z");
  assert.equal(snapshot.rateLimit.remaining, 199);
  assert.equal(snapshot.syncIssues[0]?.resource, "usage");
  assert.equal(insights[0]?.title, "Kidney · Kapha");
  assert.equal(insights[0]?.refreshAfter, "2026-04-16T19:00:00Z");
});

test("cache repository clears account-specific snapshots before key rotation", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "noesis-cache-clear-test-"),
  );
  const databasePath = path.join(tempDir, "cache.sqlite");
  const repository = createNoesisCacheRepository(databasePath);

  repository.saveRemoteSnapshot({
    baseUrl: "https://selemene.tryambakam.space",
    fetchedAt: "2026-04-23T12:00:00Z",
    profile: {
      id: "real-user",
      email: "real@example.com",
      fullName: "Real Profile",
      tier: "enterprise",
      consciousnessLevel: 3,
      experiencePoints: 999,
      preferences: {},
      fetchedAt: "2026-04-23T12:00:00Z",
    },
    readings: [
      {
        id: "real-reading",
        engineId: "biorhythm",
        inputHash: "real-hash",
        witnessPrompt: "Private profile prompt",
        consciousnessLevel: 3,
        createdAt: "2026-04-23T11:59:00Z",
        payload: { private: true },
        fetchedAt: "2026-04-23T12:00:00Z",
      },
    ],
  });

  repository.clearAll();

  const snapshot = repository.readSnapshot(
    "https://selemene.tryambakam.space",
    true,
  );
  assert.equal(snapshot.profile, undefined);
  assert.equal(snapshot.readings.length, 0);
  assert.equal(snapshot.timestamps.profile, undefined);
});

test("cache repository clears personal data without removing catalog and service snapshots", () => {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "noesis-cache-personal-clear-test-"),
  );
  const databasePath = path.join(tempDir, "cache.sqlite");
  const repository = createNoesisCacheRepository(databasePath);

  repository.saveRemoteSnapshot({
    baseUrl: "https://selemene.tryambakam.space",
    fetchedAt: "2026-04-23T12:00:00Z",
    health: {
      status: "ok",
      version: "3.0.0",
      uptimeSeconds: 42,
      enginesLoaded: 16,
      workflowsLoaded: 6,
      fetchedAt: "2026-04-23T12:00:00Z",
    },
    workflows: [
      {
        id: "daily-practice",
        name: "Daily Practice",
        description: "Reflection workflow",
        engineCount: 2,
        engineIds: ["panchanga", "vedic-clock"],
        fetchedAt: "2026-04-23T12:00:00Z",
      },
    ],
    engines: [
      {
        id: "numerology",
        name: "Numerology",
        requiredPhase: 0,
        fetchedAt: "2026-04-23T12:00:00Z",
      },
    ],
    profile: {
      id: "real-user",
      email: "real@example.com",
      fullName: "Real Profile",
      tier: "enterprise",
      consciousnessLevel: 3,
      experiencePoints: 999,
      preferences: {},
      fetchedAt: "2026-04-23T12:00:00Z",
    },
    readings: [
      {
        id: "real-reading",
        engineId: "biorhythm",
        inputHash: "real-hash",
        witnessPrompt: "Private profile prompt",
        consciousnessLevel: 3,
        createdAt: "2026-04-23T11:59:00Z",
        payload: { private: true },
        fetchedAt: "2026-04-23T12:00:00Z",
      },
    ],
  });

  repository.saveMenuBarInsights([
    {
      kind: "biorhythm",
      engineId: "biorhythm",
      title: "Energy 72%",
      summary: "Physical 81%",
      payload: { private: true },
      fetchedAt: "2026-04-23T12:00:00Z",
      refreshAfter: "2026-04-23T14:00:00Z",
    },
  ]);

  repository.clearPersonalData();

  const snapshot = repository.readSnapshot(
    "https://selemene.tryambakam.space",
    true,
  );

  assert.equal(snapshot.health?.status, "ok");
  assert.equal(snapshot.workflows.length, 1);
  assert.equal(snapshot.engines.length, 1);
  assert.equal(snapshot.profile, undefined);
  assert.equal(snapshot.readings.length, 0);
  assert.equal(snapshot.readingStats.length, 0);
  assert.equal(repository.readMenuBarInsights().length, 0);
});

test("cache repository enforces the configured reading history limit", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "noesis-cache-limit-"));
  const databasePath = path.join(tempDir, "cache.sqlite");
  const repository = createNoesisCacheRepository(databasePath, {
    readingHistoryLimit: 1,
  });

  repository.saveRemoteSnapshot({
    baseUrl: "https://selemene.tryambakam.space",
    fetchedAt: "2026-04-24T12:00:00Z",
    readings: [
      {
        id: "reading-older",
        engineId: "numerology",
        inputHash: "hash-1",
        consciousnessLevel: 1,
        createdAt: "2026-04-24T11:00:00Z",
        payload: { result: { life_path: 7 } },
        fetchedAt: "2026-04-24T12:00:00Z",
      },
      {
        id: "reading-newer",
        engineId: "numerology",
        inputHash: "hash-2",
        consciousnessLevel: 2,
        createdAt: "2026-04-24T11:30:00Z",
        payload: { result: { life_path: 9 } },
        fetchedAt: "2026-04-24T12:00:00Z",
      },
    ],
  });

  const snapshot = repository.readSnapshot(
    "https://selemene.tryambakam.space",
    true,
  );

  assert.equal(snapshot.readings.length, 1);
  assert.equal(snapshot.readings[0]?.id, "reading-newer");
});
