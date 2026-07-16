import type { RankableRepository, RepositoryRecord, RepositoryUserData } from "../../src/types/repository";

/**
 * Builders for in-memory domain fixtures used across unit tests. They provide
 * sensible defaults so each test only specifies the fields it cares about.
 */

export function makeRecord(overrides: Partial<RepositoryRecord> = {}): RepositoryRecord {
  return {
    path: "/Users/tester/code/app",
    name: "app",
    kind: "normal",
    fingerprint: "fp",
    branch: "main",
    status: "clean",
    remoteUrl: null,
    remoteWebUrl: null,
    lastCommitAt: null,
    indexedAt: 0,
    ...overrides,
  };
}

export function makeUserData(overrides: Partial<RepositoryUserData> = {}): RepositoryUserData {
  return { pinned: false, favorite: false, lastOpenedAt: null, openCount: 0, ...overrides };
}

export function makeRankable(
  record: Partial<RepositoryRecord> = {},
  userData: Partial<RepositoryUserData> = {},
): RankableRepository {
  return { record: makeRecord(record), userData: makeUserData(userData) };
}
