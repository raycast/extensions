import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "fs";
import {
  getGramWorkspaceDbVersion,
  getGramWorkspacesQuery,
  GRAM_WORKSPACES_QUERY,
  MIN_SUPPORTED_DB_VERSION,
  queryDb,
} from "./db";
import { type GramWorkspace, parseGramWorkspace } from "./workspaces";

/**
 * Check if a fixture file exists and is a valid database (not empty).
 */
function isValidFixture(path: string): boolean {
  if (!existsSync(path)) return false;
  try {
    const stat = statSync(path);
    return stat.size > 0;
  } catch {
    return false;
  }
}

/**
 * Integration tests for Gram DB queries.
 *
 * These tests require fixture files that must be generated from a real Gram database.
 *
 * If fixtures don't exist, the integration tests will be skipped.
 */
describe("Gram DB Integration Tests", () => {
  describe("v30 Schema", () => {
    const dbPath = "test/fixtures/gram-db-v30.sqlite";
    const fixtureExists = isValidFixture(dbPath);

    it.skipIf(!fixtureExists)("should detect correct version", async () => {
      const result = await getGramWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(30);
      expect(result.supported).toBe(true);
    });

    it.skipIf(!fixtureExists)("should fetch and parse workspaces correctly", async () => {
      const query = getGramWorkspacesQuery(30);
      const output = await queryDb(dbPath, query);
      const rows = output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.split("\t"));

      const gramWorkspaces = rows.map((row) => {
        const type = row[0] as "local" | "remote";
        const base = {
          id: parseInt(row[1], 10),
          paths: row[2],
          paths_order: row[3] || null,
          timestamp: parseInt(row[4], 10),
          window_id: row[5] ? parseInt(row[5], 10) : null,
          session_id: row[6] || null,
        };

        if (type === "local") {
          return { ...base, type } as GramWorkspace;
        }

        return {
          ...base,
          type,
          host: row[7] || "",
          user: row[8] || null,
          port: row[9] ? parseInt(row[9], 10) : null,
          kind: row[10] || "ssh",
          distro: row[11] || null,
          name: row[12] || null,
        } as GramWorkspace;
      });

      const parsedWorkspaces = gramWorkspaces
        .map(parseGramWorkspace)
        .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
      expect(parsedWorkspaces).toMatchSnapshot();
    });
  });

  describe("Version Support", () => {
    const dbPath = "test/fixtures/gram-db-v28.sqlite";
    const fixtureExists = isValidFixture(dbPath);

    it.skipIf(!fixtureExists)("should mark versions below MIN_SUPPORTED_DB_VERSION as unsupported", async () => {
      const result = await getGramWorkspaceDbVersion(dbPath);
      expect(result.version).toBe(28);
      expect(result.supported).toBe(false);
    });

    it("should have MIN_SUPPORTED_DB_VERSION set to 30", () => {
      expect(MIN_SUPPORTED_DB_VERSION).toBe(30);
    });
  });

  describe("Query Selection", () => {
    it("should return the same query for all supported versions", () => {
      expect(getGramWorkspacesQuery(30)).toBe(GRAM_WORKSPACES_QUERY);
      expect(getGramWorkspacesQuery(35)).toBe(GRAM_WORKSPACES_QUERY);
      expect(getGramWorkspacesQuery(40)).toBe(GRAM_WORKSPACES_QUERY);
    });

    it("should return the latest query for unsupported versions with a warning", () => {
      // Even for unsupported versions, we return the latest query
      // The caller should check version support before using results
      expect(getGramWorkspacesQuery(29)).toBe(GRAM_WORKSPACES_QUERY);
      expect(getGramWorkspacesQuery(28)).toBe(GRAM_WORKSPACES_QUERY);
    });
  });
});
