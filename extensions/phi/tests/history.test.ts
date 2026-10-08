import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPhiHistoryQuery,
  createPhiHistorySource,
  loadPhiHistoryProfiles,
  normalizeHistoryRow,
} from "../src/history";

const temporaryDirectories: string[] = [];

function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "phi-history-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

function addProfile(basePath: string, id: string, preferences?: unknown): void {
  const directory = join(basePath, id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "History"), "");
  if (preferences) {
    writeFileSync(join(directory, "Preferences"), JSON.stringify(preferences));
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Phi history data", () => {
  it("discovers non-contiguous profiles from Local State and directory fallback", () => {
    const basePath = makeTemporaryDirectory();
    addProfile(basePath, "Default");
    addProfile(basePath, "Profile 3");
    addProfile(basePath, "Profile 10", {
      profile: { name: "Directory Fallback" },
    });
    writeFileSync(
      join(basePath, "Local State"),
      JSON.stringify({
        profile: {
          info_cache: {
            Default: { name: "Work" },
            "Profile 3": { name: "Personal" },
          },
        },
      }),
    );

    expect(loadPhiHistoryProfiles(basePath)).toEqual([
      {
        id: "Default",
        name: "Work",
        historyDatabasePath: join(basePath, "Default", "History"),
      },
      {
        id: "Profile 3",
        name: "Personal",
        historyDatabasePath: join(basePath, "Profile 3", "History"),
      },
      {
        id: "Profile 10",
        name: "Directory Fallback",
        historyDatabasePath: join(basePath, "Profile 10", "History"),
      },
    ]);
  });

  it("creates a default profile source when no History database exists", () => {
    const basePath = makeTemporaryDirectory();

    expect(createPhiHistorySource(basePath)).toEqual({
      basePath,
      profiles: [
        {
          id: "Default",
          name: undefined,
          historyDatabasePath: join(basePath, "Default", "History"),
        },
      ],
    });
  });

  it("builds an escaped multi-term query with a bounded limit", () => {
    const query = buildPhiHistoryQuery(
      "docs 100% foo_bar path\\name O'Reilly",
      900,
    );

    expect(query).toContain("url LIKE '%docs%'");
    expect(query).toContain("url LIKE '%100\\%%'");
    expect(query).toContain("url LIKE '%foo\\_bar%'");
    expect(query).toContain("url LIKE '%path\\\\name%'");
    expect(query).toContain("url LIKE '%O''Reilly%'");
    expect(query.match(/ AND /g)).toHaveLength(6);
    expect(query).toContain("hidden = 0");
    expect(query).toContain("url <> ''");
    expect(query).toContain("ORDER BY last_visit_time DESC");
    expect(query).toContain("LIMIT 500");
  });

  it("maps Chromium timestamps and adds profile labels only when needed", () => {
    const entry = normalizeHistoryRow(
      {
        id: 7,
        url: "https://example.com",
        title: "Example",
        lastVisitedAtMs: 1_700_000_000_000,
      },
      {
        id: "Profile 3",
        name: "Personal",
        historyDatabasePath: "/tmp/Profile 3/History",
      },
      true,
    );

    expect(entry).toEqual({
      id: 7,
      url: "https://example.com",
      title: "Example",
      lastVisitedAt: new Date(1_700_000_000_000),
      profileId: "Profile 3",
      profileName: "Personal",
    });
  });
});
