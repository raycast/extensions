import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAccountRepository, resolveAccountDbPath } from "../db";
import { assert, test } from "./test-harness";

function makeTempDbPath() {
  const baseDir = mkdtempSync(join(tmpdir(), "applepw-db-"));
  return {
    baseDir,
    dbPath: join(baseDir, "accounts.sqlite3"),
  };
}

function makeTempSupportPath() {
  const baseDir = mkdtempSync(join(tmpdir(), "applepw-support-"));
  return {
    baseDir,
    supportPath: join(baseDir, "support"),
    dbPath: join(baseDir, "support", "accounts.sqlite3"),
  };
}

async function withRepository<T>(
  fn: (repository: Awaited<ReturnType<typeof createAccountRepository>>, dbPath: string) => Promise<T>,
  now: () => Date = () => new Date("2026-04-08T00:00:00.000Z"),
) {
  const { baseDir, dbPath } = makeTempDbPath();
  const repository = await createAccountRepository({ dbPath, now });

  try {
    return await fn(repository, dbPath);
  } finally {
    await repository.close();
    rmSync(baseDir, { recursive: true, force: true });
  }
}

test("creates db when missing", async () => {
  await withRepository(async (_repository, dbPath) => {
    assert.equal(existsSync(dbPath), true);
  });
});

test("uses support path for the default db location", async () => {
  const { baseDir, supportPath, dbPath } = makeTempSupportPath();
  const repository = await createAccountRepository({ supportPath, now: () => new Date("2026-04-08T00:00:00.000Z") });

  try {
    assert.equal(repository.dbPath, dbPath);
    assert.equal(existsSync(dbPath), true);
  } finally {
    await repository.close();
    rmSync(baseDir, { recursive: true, force: true });
  }
});

test("resolves db path from support path without opening the database", () => {
  const { supportPath, dbPath } = makeTempSupportPath();

  assert.equal(resolveAccountDbPath({ supportPath }), dbPath);
});

test("upserts domain and username rows", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "example.com", username: "alice@example.com", hasOtp: true },
      { domain: "example.com", username: "alice@example.com", hasOtp: true },
    ]);

    const rows = await repository.searchAccounts("example.com");

    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      domain: "example.com",
      username: "alice@example.com",
      hasOtp: true,
      firstSeenAt: "2026-04-08T00:00:00.000Z",
      lastSeenAt: "2026-04-08T00:00:00.000Z",
      lastUsedAt: undefined,
    });
  });
});

test("preserves first_seen_at on repeated upserts", async () => {
  let tick = 0;
  const times = [new Date("2026-04-08T00:00:00.000Z"), new Date("2026-04-08T01:00:00.000Z")];

  await withRepository(
    async (repository) => {
      await repository.upsertDiscoveredAccounts([{ domain: "example.com", username: "alice@example.com" }]);
      await repository.upsertDiscoveredAccounts([{ domain: "example.com", username: "alice@example.com" }]);

      const rows = await repository.searchAccounts("example.com");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].firstSeenAt, times[0].toISOString());
    },
    () => times[Math.min(tick++, times.length - 1)],
  );
});

test("updates last_seen_at on repeated upserts", async () => {
  let tick = 0;
  const times = [new Date("2026-04-08T00:00:00.000Z"), new Date("2026-04-08T01:00:00.000Z")];

  await withRepository(
    async (repository) => {
      await repository.upsertDiscoveredAccounts([{ domain: "example.com", username: "alice@example.com" }]);
      await repository.upsertDiscoveredAccounts([{ domain: "example.com", username: "alice@example.com" }]);

      const rows = await repository.searchAccounts("example.com");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].lastSeenAt, times[1].toISOString());
    },
    () => times[Math.min(tick++, times.length - 1)],
  );
});

test("records last_used_at when an account is marked used", async () => {
  let tick = 0;
  const times = [new Date("2026-04-08T00:00:00.000Z"), new Date("2026-04-08T01:00:00.000Z")];

  await withRepository(
    async (repository) => {
      await repository.upsertDiscoveredAccounts([{ domain: "example.com", username: "alice@example.com" }]);
      await repository.markAccountUsed("example.com", "alice@example.com");

      const rows = await repository.searchAccounts("example.com");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].lastUsedAt, times[1].toISOString());
    },
    () => times[Math.min(tick++, times.length - 1)],
  );
});

test("searches by exact domain", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "example.com", username: "alice@other.com" },
      { domain: "login.example.com", username: "bob@other.com" },
    ]);

    const rows = await repository.searchAccounts("login.example.com");

    assert.equal(rows.length, 1);
    assert.equal(rows[0].domain, "login.example.com");
  });
});

test("searches by domain suffix", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "example.com", username: "alice@other.com" },
      { domain: "login.example.com", username: "bob@other.com" },
    ]);

    const rows = await repository.searchAccounts("example.com");

    assert.equal(
      rows.some((row) => row.domain === "login.example.com"),
      true,
    );
  });
});

test("searches by username fragment", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "example.com", username: "alice@other.com" },
      { domain: "example.org", username: "bob@other.com" },
    ]);

    const rows = await repository.searchAccounts("ali");

    assert.equal(rows.length, 1);
    assert.equal(rows[0].username, "alice@other.com");
  });
});

test("treats wildcard characters in search input literally", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "example.com", username: "alice@other.com" },
      { domain: "other.com", username: "bob@other.com" },
    ]);

    const rows = await repository.searchAccounts("ali%");

    assert.equal(rows.length, 0);
  });
});

test("prefers exact domain matches over username-only matches", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "other.com", username: "github.com@user.test" },
      { domain: "github.com", username: "alice@other.com" },
    ]);

    const rows = await repository.searchAccounts("github.com");

    assert.equal(rows.length, 2);
    assert.equal(rows[0].domain, "github.com");
  });
});

test("matches domains with a single missing character", async () => {
  await withRepository(async (repository) => {
    await repository.upsertDiscoveredAccounts([
      { domain: "github.com", username: "alice@github.com" },
      { domain: "gitlab.com", username: "bob@gitlab.com" },
    ]);

    const rows = await repository.searchAccounts("githb.com");

    assert.equal(rows.length, 1);
    assert.equal(rows[0].domain, "github.com");
  });
});

test("prefers recently used matches over never-used matches", async () => {
  let tick = 0;
  const times = [
    new Date("2026-04-08T00:00:00.000Z"),
    new Date("2026-04-08T01:00:00.000Z"),
    new Date("2026-04-08T02:00:00.000Z"),
  ];

  await withRepository(
    async (repository) => {
      await repository.upsertDiscoveredAccounts([
        { domain: "github.com", username: "alice@other.com" },
        { domain: "github.com", username: "bob@other.com" },
      ]);
      await repository.markAccountUsed("github.com", "bob@other.com");

      const rows = await repository.searchAccounts("github.com");

      assert.equal(rows.length, 2);
      assert.equal(rows[0].username, "bob@other.com");
      assert.equal(rows[0].lastUsedAt, times[2].toISOString());
    },
    () => times[Math.min(tick++, times.length - 1)],
  );
});
