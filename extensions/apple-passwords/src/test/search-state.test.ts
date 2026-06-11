import { strict as assert } from "node:assert";
import {
  APPLEPW_INSTALL_COMMAND,
  createAuthPromptDescriptionProps,
  createAuthPromptFieldProps,
  createImportCsvPickerProps,
  createAuthPromptSubmitActionProps,
  createImportCsvDescriptionProps,
  createImportCsvSubmitActionProps,
  createMissingBinaryMarkdown,
  createPasswordSearchWorkflow,
  isMissingApplePwBinaryError,
  loadPasswordsCsv,
  parsePasswordsCsv,
} from "../apw";
import { type ApplePwClient } from "../applepw";
import { type AccountRepository } from "../db";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "./test-harness";

function makeApplePwClient(overrides: Partial<ApplePwClient>): ApplePwClient {
  return {
    getStatus: async () => ({
      kind: "success",
      payload: { status: "ready", daemon: "running", authenticated: true },
      stdout: "",
      stderr: "",
    }),
    listPasswords: async () => ({
      kind: "success",
      payload: [],
      stdout: "",
      stderr: "",
    }),
    getPassword: async () => {
      throw new Error("not used");
    },
    getOtp: async () => {
      throw new Error("not used");
    },
    authenticate: async () => ({ status: 0 }),
    execute: async () => {
      throw new Error("not used");
    },
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<Pick<AccountRepository, "upsertDiscoveredAccounts" | "markAccountUsed" | "searchAccounts">>,
): Pick<AccountRepository, "upsertDiscoveredAccounts" | "markAccountUsed" | "searchAccounts"> {
  return {
    upsertDiscoveredAccounts: async () => undefined,
    markAccountUsed: async () => undefined,
    searchAccounts: async () => [],
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test("ignores empty search queries without calling applepw", async () => {
  let listCalls = 0;
  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => {
        listCalls += 1;
        return {
          kind: "success",
          payload: [],
          stdout: "",
          stderr: "",
        };
      },
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async () => undefined,
      searchAccounts: async () => [],
    }),
  });

  const result = await workflow.search("   ");

  assert.equal(result.kind, "results");
  assert.equal(result.rows.length, 0);
  assert.equal(listCalls, 0);
});

test("keeps the latest auth-required search for pin retry", async () => {
  const calls: string[] = [];
  const first = deferred<
    | {
        kind: "auth-required";
        prompt: string;
        stdout: string;
        stderr: string;
      }
    | {
        kind: "success";
        payload: Array<{
          id: string;
          username: string;
          domain: string;
          password: string;
        }>;
        stdout: string;
        stderr: string;
      }
  >();
  const second = deferred<
    | {
        kind: "auth-required";
        prompt: string;
        stdout: string;
        stderr: string;
      }
    | {
        kind: "success";
        payload: Array<{
          id: string;
          username: string;
          domain: string;
          password: string;
        }>;
        stdout: string;
        stderr: string;
      }
  >();
  let authenticated = false;

  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async (query: string) => {
        calls.push(`list:${query}`);
        if (!authenticated) {
          if (query === "first") {
            return await first.promise;
          }

          return await second.promise;
        }

        return {
          kind: "success",
          payload: [
            {
              id: "retry",
              username: "retry@example.com",
              domain: query,
              password: `${query}-secret`,
            },
          ],
          stdout: "",
          stderr: "",
        };
      },
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async (pin: string) => {
        calls.push(`auth:${pin}`);
        authenticated = true;
        return { status: 0 };
      },
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async () => undefined,
      searchAccounts: async () => [],
    }),
  });

  const firstSearch = workflow.search("first");
  const secondSearch = workflow.search("second");

  second.resolve({
    kind: "auth-required",
    prompt: "Enter PIN:",
    stdout: "Enter PIN:",
    stderr: "",
  });
  const secondOutcome = await secondSearch;

  first.resolve({
    kind: "auth-required",
    prompt: "Enter PIN:",
    stdout: "Enter PIN:",
    stderr: "",
  });
  const firstOutcome = await firstSearch;

  assert.equal(firstOutcome.kind, "auth-required");
  assert.equal(secondOutcome.kind, "auth-required");

  const result = await workflow.submitPin("123456");

  assert.equal(result.kind, "results");
  assert.equal(result.query, "second");
  assert.deepEqual(calls, ["list:first", "list:second", "auth:123456", "list:second"]);
});

test("renders cached rows after live discovery upserts accounts", async () => {
  const upserts: unknown[] = [];
  const repository = makeRepository({
    upsertDiscoveredAccounts: async (accounts: unknown[]) => {
      upserts.push(accounts);
    },
    markAccountUsed: async () => undefined,
    searchAccounts: async () => [
      {
        domain: "example.com",
        username: "alice@example.com",
        hasOtp: true,
        firstSeenAt: "2026-04-08T00:00:00.000Z",
        lastSeenAt: "2026-04-08T00:00:00.000Z",
        lastUsedAt: undefined,
      },
    ],
  });

  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => ({
        kind: "success",
        payload: [
          {
            id: "1",
            username: "alice@example.com",
            domain: "example.com",
            password: "secret",
            has_otp: true,
          },
        ],
        stdout: "",
        stderr: "",
      }),
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository,
  });

  const result = await workflow.search("example.com");

  assert.equal(result.kind, "results");
  assert.deepEqual(upserts, [[{ domain: "example.com", username: "alice@example.com", hasOtp: true }]]);
  assert.deepEqual(result.rows, await repository.searchAccounts("example.com"));
});

test("falls back to cached rows when live discovery returns nothing", async () => {
  const repository = makeRepository({
    upsertDiscoveredAccounts: async () => undefined,
    markAccountUsed: async () => undefined,
    searchAccounts: async () => [
      {
        domain: "example.com",
        username: "bob@example.com",
        hasOtp: false,
        firstSeenAt: "2026-04-08T00:00:00.000Z",
        lastSeenAt: "2026-04-08T01:00:00.000Z",
      },
    ],
  });

  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => ({
        kind: "success",
        payload: [],
        stdout: "",
        stderr: "",
      }),
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository,
  });

  const result = await workflow.search("example.com");

  assert.equal(result.kind, "results");
  assert.deepEqual(result.rows, await repository.searchAccounts("example.com"));
});

test("prompts for pin when discovery requires auth", async () => {
  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => ({
        kind: "auth-required",
        prompt: "Enter PIN:",
        stdout: "Enter PIN:",
        stderr: "",
      }),
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async () => undefined,
      searchAccounts: async () => [],
    }),
  });

  const result = await workflow.search("example.com");

  assert.equal(result.kind, "auth-required");
  assert.equal(result.prompt, "Enter PIN:");
  assert.deepEqual(result.pendingAction, { kind: "search", query: "example.com" });
});

test("retries the original search after pin auth succeeds", async () => {
  const calls: string[] = [];
  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => {
        calls.push("list");
        if (calls.length === 1) {
          return {
            kind: "auth-required",
            prompt: "Enter PIN:",
            stdout: "Enter PIN:",
            stderr: "",
          };
        }

        return {
          kind: "success",
          payload: [
            {
              id: "1",
              username: "alice@example.com",
              domain: "example.com",
              password: "secret",
              has_otp: true,
            },
          ],
          stdout: "",
          stderr: "",
        };
      },
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async (pin: string) => {
        calls.push(`auth:${pin}`);
        return { status: 0 };
      },
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async () => undefined,
      searchAccounts: async () => [
        {
          domain: "example.com",
          username: "alice@example.com",
          hasOtp: true,
          firstSeenAt: "2026-04-08T00:00:00.000Z",
          lastSeenAt: "2026-04-08T00:00:00.000Z",
          lastUsedAt: undefined,
        },
      ],
    }),
  });

  const pending = await workflow.search("example.com");
  assert.equal(pending.kind, "auth-required");

  const result = await workflow.submitPin("123456");

  assert.equal(result.kind, "results");
  assert.deepEqual(calls, ["list", "auth:123456", "list"]);
});

test("authenticates startup pin submissions without a pending action", async () => {
  const calls: string[] = [];
  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      authenticate: async (pin: string) => {
        calls.push(`auth:${pin}`);
        return { status: 0 };
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async () => undefined,
      searchAccounts: async () => [],
    }),
  });

  const result = await workflow.submitPin("654321");

  assert.equal(result.kind, "results");
  assert.equal(result.query, "");
  assert.deepEqual(result.rows, []);
  assert.deepEqual(calls, ["auth:654321"]);
});

test("fetches password and otp secrets for the selected account", async () => {
  const used: string[] = [];
  const account = {
    domain: "example.com",
    username: "alice@example.com",
    hasOtp: true,
    firstSeenAt: "2026-04-08T00:00:00.000Z",
    lastSeenAt: "2026-04-08T00:00:00.000Z",
    lastUsedAt: undefined,
  };

  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => ({
        kind: "success",
        payload: [],
        stdout: "",
        stderr: "",
      }),
      getPassword: async () => ({
        kind: "success",
        payload: [
          {
            id: "pw-1",
            username: account.username,
            domain: account.domain,
            password: "super-secret",
          },
        ],
        stdout: "",
        stderr: "",
      }),
      getOtp: async () => ({
        kind: "success",
        payload: [
          {
            id: "otp-1",
            username: account.username,
            domain: account.domain,
            code: "123456",
          },
        ],
        stdout: "",
        stderr: "",
      }),
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async () => undefined,
      markAccountUsed: async (domain: string, username: string) => {
        used.push(`${domain}:${username}`);
      },
      searchAccounts: async () => [],
    }),
  });

  const passwordOutcome = await workflow.fetchPassword(account);
  const otpOutcome = await workflow.fetchOtp(account);

  assert.equal(passwordOutcome.kind, "secret");
  assert.equal(passwordOutcome.action, "password");
  assert.equal(passwordOutcome.value, "super-secret");
  assert.equal(otpOutcome.kind, "secret");
  assert.equal(otpOutcome.action, "otp");
  assert.equal(otpOutcome.value, "123456");
  assert.deepEqual(used, ["example.com:alice@example.com", "example.com:alice@example.com"]);
});

test("imports cached accounts and refreshes the current query from sqlite", async () => {
  const upserts: unknown[] = [];
  const workflow = createPasswordSearchWorkflow({
    applePw: makeApplePwClient({
      listPasswords: async () => ({
        kind: "success",
        payload: [],
        stdout: "",
        stderr: "",
      }),
      getPassword: async () => {
        throw new Error("not used");
      },
      getOtp: async () => {
        throw new Error("not used");
      },
      authenticate: async () => ({ status: 0 }),
      execute: async () => {
        throw new Error("not used");
      },
    }),
    repository: makeRepository({
      upsertDiscoveredAccounts: async (accounts: unknown[]) => {
        upserts.push(accounts);
      },
      markAccountUsed: async () => undefined,
      searchAccounts: async (query: string) => [
        {
          domain: query,
          username: "imported@example.com",
          hasOtp: true,
          firstSeenAt: "2026-04-08T00:00:00.000Z",
          lastSeenAt: "2026-04-08T01:00:00.000Z",
          lastUsedAt: undefined,
        },
      ],
    }),
  });

  const imported = [
    {
      domain: "example.com",
      username: "imported@example.com",
      hasOtp: true,
    },
  ];
  const result = await workflow.importAccounts(imported, "example.com");

  assert.equal(result.kind, "results");
  assert.deepEqual(upserts, [imported]);
  assert.equal(result.rows[0].domain, "example.com");
});

test("trims and forwards auth prompt submissions", async () => {
  const submissions: string[] = [];
  const props = createAuthPromptSubmitActionProps(async (pin: string) => {
    submissions.push(pin);
  });

  assert.equal(typeof props.onSubmit, "function");

  await props.onSubmit({ pin: " 123456 " });

  assert.deepEqual(submissions, ["123456"]);
});

test("trims and forwards csv import submissions", async () => {
  const submissions: string[] = [];
  const props = createImportCsvSubmitActionProps(async (filePath: string) => {
    submissions.push(filePath);
  });

  assert.equal(typeof props.onSubmit, "function");

  await props.onSubmit({ filePath: [" /Users/test/Passwords.csv "] });

  assert.deepEqual(submissions, ["/Users/test/Passwords.csv"]);
});

test("uses a password field for auth entry so the code is not visible while typing", () => {
  const props = createAuthPromptFieldProps();

  assert.deepEqual(props, {
    id: "pin",
    title: "Code",
    placeholder: "Enter your Apple Passwords code",
    autoFocus: true,
  });
});

test("uses setup-style auth description copy", () => {
  const props = createAuthPromptDescriptionProps("Apple Passwords needs authentication before searching.");

  assert.deepEqual(props, {
    title: "Unlock Apple Passwords",
    text: "Apple Passwords needs authentication before searching.",
  });
});

test("uses setup-style csv import description copy", () => {
  const props = createImportCsvDescriptionProps();

  assert.deepEqual(props, {
    title: "Import Search Cache",
    text: [
      "1. Open the Apple Passwords app.",
      "2. Choose File > Export All Passwords to File.",
      "3. Select that CSV here to import it into the password cache.",
      "",
      "This only imports website, username, and OTP metadata. Password values are ignored and are not written to the password cache.",
    ].join("\n"),
  });
});

test("uses a single-file csv picker with no initial selection", () => {
  const props = createImportCsvPickerProps();

  assert.deepEqual(props, {
    id: "filePath",
    title: "CSV File",
    defaultValue: undefined,
    allowMultipleSelection: false,
    canChooseFiles: true,
    canChooseDirectories: false,
    autoFocus: true,
  });
});

test("parses importable accounts from apple passwords csv", () => {
  const csv = [
    "Title,URL,Username,Password,Notes,OTPAuth",
    '"GitHub","https://github.com/login","alice@example.com","secret","",',
    '"Google","https://accounts.google.com/","alice@example.com","secret","","otpauth://totp/test"',
    '"Duplicate","https://accounts.google.com/","alice@example.com","secret","",',
    '"Invalid","not-a-url","nobody@example.com","secret","",',
  ].join("\n");

  assert.deepEqual(parsePasswordsCsv(csv), [
    {
      domain: "github.com",
      username: "alice@example.com",
      hasOtp: false,
    },
    {
      domain: "accounts.google.com",
      username: "alice@example.com",
      hasOtp: true,
    },
  ]);
});

test("loads accounts from a csv file on disk", async () => {
  const baseDir = mkdtempSync(join(tmpdir(), "applepw-csv-"));
  const filePath = join(baseDir, "Passwords.csv");
  writeFileSync(
    filePath,
    "Title,URL,Username,Password,Notes,OTPAuth\nGitHub,https://github.com/,alice@example.com,secret,,\n",
  );

  try {
    const accounts = await loadPasswordsCsv(filePath);

    assert.deepEqual(accounts, [
      {
        domain: "github.com",
        username: "alice@example.com",
        hasOtp: false,
      },
    ]);
  } finally {
    rmSync(baseDir, { recursive: true, force: true });
  }
});

test("detects missing applepw binary errors", () => {
  assert.equal(isMissingApplePwBinaryError(new Error('Unable to locate applepw binary. Tried: "applepw"')), true);
  assert.equal(isMissingApplePwBinaryError(new Error("some other error")), false);
});

test("renders setup markdown for missing applepw", () => {
  const markdown = createMissingBinaryMarkdown();

  assert.equal(markdown.includes("Install Apple Passwords CLI"), true);
  assert.equal(markdown.includes(APPLEPW_INSTALL_COMMAND), true);
});
