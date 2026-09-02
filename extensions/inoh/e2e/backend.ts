/**
 * Thin wrapper around the shared fixture CLI in `inoh-backend`.
 *
 * The CLI owns the knowledge (what a reset does, what each seed profile means,
 * where a sign-in code comes from); this only spawns it and parses its JSON.
 * The same file lives in each client repo's e2e suite — it is deliberately
 * free of any knowledge worth sharing, so copying beats coupling five repos
 * to one npm package they would each have to install. Point
 * `INOH_BACKEND_DIR` at the backend checkout if it is not the sibling
 * directory.
 *
 * `AccountState` and `SeededAccount` mirror the CLI's whole JSON contract
 * rather than only the fields this repo's specs read today. That is deliberate:
 * the wrapper is a verbatim copy in every client repo, and trimming each copy
 * to its current callers would make them diverge. The contract is documented
 * once, in inoh-backend/supabase/e2e/README.md.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";

// Reason: resolved from the working directory rather than this file, so the
// same wrapper works whether the repo it lives in is CommonJS or ESM (where
// `__dirname` does not exist). Vitest always runs from the repo root.
const BACKEND_DIR = process.env.INOH_BACKEND_DIR ?? path.resolve(process.cwd(), "../inoh-backend");
const CLI_PATH = path.join(BACKEND_DIR, "supabase/e2e/cli.ts");

/**
 * The account both specs drive. One address, so the UI spec and the module spec
 * cannot disagree about which account is under test.
 */
export const TEST_ACCOUNT_EMAIL = "e2e-raycast@test.com";

export type Plan = "free" | "plus" | "pro";
export type SeedProfile = "learner" | "empty" | "pronunciation-cap" | "card-cap";

export type SeededAccount = {
  email: string;
  userId: string;
  username: string | null;
  plan: Plan;
  profile: SeedProfile;
  deckId: string;
  deckName: string;
  cardCount: number;
  words: string[];
  dueWords: string[];
  spareWords: string[];
};

export type AccountState = {
  email: string;
  userId: string;
  username: string | null;
  plan: Plan;
  subscription: {
    status: string;
    billingInterval: string | null;
    cancelAtPeriodEnd: boolean;
    scheduledPlan: string | null;
    scheduledBillingInterval: string | null;
    hasStripeCustomer: boolean;
  } | null;
  decks: { id: string; name: string; isDefault: boolean; cardCount: number }[];
  cardCount: number;
  words: string[];
  dueWordCount: number;
  streak: { current: number; longest: number } | null;
  pronunciationPracticesThisMonth: number;
  cardRequests: { word: string; status: string }[];
};

/**
 * Runs one fixture command.
 *
 * @param command - CLI command name, e.g. `reset-user`
 * @param flags - Flags without their leading dashes
 * @returns The command's parsed JSON output
 * @throws When the stack is unreachable or the command rejects its input
 */
function _runFixtureCommand<T>(command: string, flags: Record<string, string> = {}): T {
  const args = ["run", "--allow-env", "--allow-net", CLI_PATH, command];
  for (const [name, value] of Object.entries(flags)) {
    args.push(`--${name}`, value);
  }
  try {
    // Reason: stdio 'pipe' for stdout only — the CLI logs progress on stderr,
    // which is inherited so a failing run explains itself in the report.
    const stdout = execFileSync("deno", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(
      `Fixture command \`${command}\` failed. Is the local stack up (\`pnpm db:start\` in ` +
        `inoh-backend) and is ${CLI_PATH} present?\n${(error as Error).message}`,
    );
  }
}

/** Fails the run early, with the fix, when the local stack is not ready. */
export const assertLocalStackReady = (): void => {
  // The CLI exits non-zero when a check fails, which _runFixtureCommand turns
  // into a throw — so reaching the next line is the assertion.
  _runFixtureCommand("doctor");
};

/**
 * Deletes, recreates, and seeds one account.
 *
 * @param options - The account's address, plan, and seed profile
 * @returns The seeded account, including the words it was given
 */
export const resetAccount = (options: { email: string; plan?: Plan; profile?: SeedProfile }): SeededAccount =>
  _runFixtureCommand<SeededAccount>("reset-user", {
    email: options.email,
    plan: options.plan ?? "free",
    profile: options.profile ?? "learner",
  });

/**
 * Waits for the newest sign-in email and returns its six-digit code.
 *
 * @param email - Recipient to watch
 * @param sinceMs - Ignore mail that arrived at or before this instant, so a
 *   code from an earlier test is never mistaken for this one
 * @returns The six-digit code
 */
export const readSignInCode = (email: string, sinceMs: number): string =>
  _runFixtureCommand<{ code: string }>("otp", {
    email,
    "newer-than-ms": String(sinceMs),
  }).code;

/**
 * What the client actually wrote to the database.
 *
 * @param email - The account to snapshot
 * @returns The account's persisted state
 */
export const readAccountState = (email: string): AccountState => _runFixtureCommand<AccountState>("state", { email });

/**
 * Creates a dictionary word that exists only on the local stack.
 *
 * A client pointed at production cannot find it, which is what makes driving
 * a native UI blindly safe.
 *
 * @returns The word
 */
export const ensureSyntheticWord = (): string =>
  _runFixtureCommand<{ words: string[] }>("ensure-synthetic-words", {
    count: "1",
  }).words[0];
