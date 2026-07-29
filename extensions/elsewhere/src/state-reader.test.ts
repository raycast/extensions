import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  ELSEWHERE_SNAPSHOT_FILENAME,
  ELSEWHERE_USER_DATA_PREFIX,
  ElsewhereSnapshotV1,
  parseElsewhereSnapshot,
  readElsewhereState,
} from "./state-reader";

function snapshot(overrides: Partial<ElsewhereSnapshotV1> = {}): ElsewhereSnapshotV1 {
  return {
    schemaVersion: 1,
    appVersion: "1.0.0",
    running: true,
    processId: 1234,
    instanceId: "instance-123",
    updatedAt: "2026-07-28T12:00:00.000Z",
    ready: true,
    requiresSetup: false,
    playing: false,
    activeSpaceId: "space-1",
    spaces: [{ id: "space-1", name: "Coffee and Thunder" }],
    ambienceVolume: 40,
    backgroundMusicEnabled: false,
    backgroundMusicLoading: false,
    activeMusicTrackId: "lo-fi",
    musicVolume: 85,
    musicTracks: [{ id: "lo-fi", name: "Lo-fi Hip-Hop" }],
    sources: [{ id: "source-1", name: "Rain on window", soundId: "rain-window", enabled: true }],
    lastCommand: null,
    ...overrides,
  };
}

async function withApplicationSupport(
  callback: (directory: string, writeSnapshot: (folder: string, value: unknown) => Promise<void>) => Promise<void>,
) {
  const directory = await mkdtemp(path.join(tmpdir(), "elsewhere-state-reader-"));
  const writeSnapshot = async (folder: string, value: unknown) => {
    const userDataDirectory = path.join(directory, folder);
    await mkdir(userDataDirectory, { recursive: true });
    await writeFile(path.join(userDataDirectory, ELSEWHERE_SNAPSHOT_FILENAME), JSON.stringify(value), "utf8");
  };

  try {
    await callback(directory, writeSnapshot);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("parses the published schema v1 contract", () => {
  const parsed = parseElsewhereSnapshot(
    snapshot({
      spaces: [
        {
          id: "space-1",
          name: "Coffee and Thunder",
          description: "Rain on window, distant thunder, and 6 more",
          color: "#917784",
        },
      ],
      musicTracks: [{ id: "lo-fi", name: "Lo-fi Hip-Hop", description: "Warm keys and a soft pocket" }],
      lastCommand: {
        requestId: "raycast_123",
        status: "success",
        command: "experience:play",
        completedAt: "2026-07-28T12:00:01.000Z",
      },
    }),
  );

  assert.equal(parsed.kind, "valid");
  if (parsed.kind === "valid") {
    assert.equal(parsed.snapshot.lastCommand?.requestId, "raycast_123");
    assert.equal(parsed.snapshot.sources[0].enabled, true);
    assert.equal(parsed.snapshot.spaces[0].color, "#917784");
    assert.equal(parsed.snapshot.spaces[0].description, "Rain on window, distant thunder, and 6 more");
    assert.equal(parsed.snapshot.musicTracks[0].description, "Warm keys and a soft pocket");
  }
});

test("accepts rollout snapshots without optional presentation metadata and rejects malformed values", () => {
  assert.equal(parseElsewhereSnapshot(snapshot()).kind, "valid");
  assert.equal(
    parseElsewhereSnapshot(snapshot({ spaces: [{ id: "space-1", name: "Coffee and Thunder", color: "#91778" }] })).kind,
    "malformed",
  );
  assert.equal(
    parseElsewhereSnapshot(snapshot({ spaces: [{ id: "space-1", name: "Coffee and Thunder", color: "#91778a" }] }))
      .kind,
    "malformed",
  );
  assert.equal(
    parseElsewhereSnapshot(
      snapshot({ musicTracks: [{ id: "lo-fi", name: "Lo-fi Hip-Hop", description: 72 as unknown as string }] }),
    ).kind,
    "malformed",
  );
  const normalized = parseElsewhereSnapshot(
    snapshot({ musicTracks: [{ id: "lo-fi", name: "Lo-fi Hip-Hop", description: "  Warm keys  " }] }),
  );
  assert.equal(normalized.kind, "valid");
  if (normalized.kind === "valid") assert.equal(normalized.snapshot.musicTracks[0].description, "Warm keys");
});

test("rejects malformed and unsupported snapshots", () => {
  assert.deepEqual(parseElsewhereSnapshot({ schemaVersion: 2 }), { kind: "unsupported", schemaVersion: 2 });
  assert.equal(parseElsewhereSnapshot({ ...snapshot(), ambienceVolume: 101 }).kind, "malformed");
  assert.equal(parseElsewhereSnapshot({ ...snapshot(), lastCommand: { status: "success" } }).kind, "malformed");
});

test("discovers environment-specific app-data suffixes and identifies live state", async () => {
  await withApplicationSupport(async (directory, writeSnapshot) => {
    await writeSnapshot(`${ELSEWHERE_USER_DATA_PREFIX}-local`, snapshot());

    const state = await readElsewhereState({
      applicationSupportDirectory: directory,
      processIsAlive: (processId) => processId === 1234,
    });

    assert.equal(state.kind, "ready");
    if (state.kind === "ready") assert.equal(state.snapshot.activeSpaceId, "space-1");
  });
});

test("reports stopped, orphaned, malformed, and missing snapshots distinctly", async () => {
  await withApplicationSupport(async (directory, writeSnapshot) => {
    assert.equal((await readElsewhereState({ applicationSupportDirectory: directory })).kind, "unavailable");

    await writeSnapshot(ELSEWHERE_USER_DATA_PREFIX, snapshot({ running: false }));
    assert.equal((await readElsewhereState({ applicationSupportDirectory: directory })).kind, "stale");
  });

  await withApplicationSupport(async (directory, writeSnapshot) => {
    await writeSnapshot(`${ELSEWHERE_USER_DATA_PREFIX}-preview`, snapshot());
    const state = await readElsewhereState({
      applicationSupportDirectory: directory,
      processIsAlive: () => false,
    });
    assert.equal(state.kind, "stale");
    if (state.kind === "stale") assert.equal(state.reason, "process-not-running");
  });

  await withApplicationSupport(async (directory, writeSnapshot) => {
    await writeSnapshot(ELSEWHERE_USER_DATA_PREFIX, { schemaVersion: 1, ready: "yes" });
    assert.equal((await readElsewhereState({ applicationSupportDirectory: directory })).kind, "malformed");
  });
});

test("prefers a live snapshot over a newer stopped environment", async () => {
  await withApplicationSupport(async (directory, writeSnapshot) => {
    await writeSnapshot(
      ELSEWHERE_USER_DATA_PREFIX,
      snapshot({ processId: 100, updatedAt: "2026-07-28T12:00:00.000Z" }),
    );
    await writeSnapshot(
      `${ELSEWHERE_USER_DATA_PREFIX}-local`,
      snapshot({ processId: 200, running: false, updatedAt: "2026-07-28T13:00:00.000Z" }),
    );

    const state = await readElsewhereState({
      applicationSupportDirectory: directory,
      processIsAlive: (processId) => processId === 100,
    });

    assert.equal(state.kind, "ready");
    if (state.kind === "ready") assert.equal(state.snapshot.processId, 100);
  });
});
