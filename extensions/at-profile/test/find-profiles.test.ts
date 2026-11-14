import { beforeEach, describe, expect, it } from "vitest";
import { Cache, LocalStorage } from "@raycast/api";
import type { CheckResult, CheckTarget } from "../src/catalog/types";
import { describeFindings, findProfiles } from "../src/helpers/find-profiles";
import { FIND_PROFILE_APP_ID, readFindings } from "../src/helpers/findings";
import { getHistory } from "../src/helpers/history";
import { resetMigrationState } from "../src/helpers/storage";

beforeEach(async () => {
  await LocalStorage.clear();
  resetMigrationState();
  new Cache({ namespace: "findings" }).clear();
});

// GitHub has the profile; every other site that answers doesn't
const check = async (target: CheckTarget): Promise<CheckResult> =>
  target.urlTemplate.includes("github.com") ? { status: "found", httpStatus: 200 } : { status: "not-found" };

describe("findProfiles", () => {
  it("searches, keeps the findings and records the search in History", async () => {
    const result = await findProfiles("@ExampleUser", { check });
    expect(result.profile).toBe("ExampleUser");
    expect(result.rows.find((row) => row.name === "GitHub")?.outcome.status).toBe("found");
    expect(readFindings("exampleuser")?.outcomes.github).toMatchObject({ status: "found" });
    expect((await getHistory())[0]).toMatchObject({ profile: "ExampleUser", app: FIND_PROFILE_APP_ID });
  });

  it("refuses an empty username", async () => {
    await expect(findProfiles(" @ ", { check })).rejects.toThrow("username");
  });
});

describe("describeFindings", () => {
  it("lists each found profile with its URL, then what couldn't be checked", async () => {
    const text = describeFindings(await findProfiles("exampleuser", { check }));
    expect(text).toMatch(/^@exampleuser has a profile on 1 of \d+ sites/);
    expect(text).toContain("- GitHub: https://github.com/exampleuser");
    expect(text).toContain("Not checked");
    expect(text).toContain("X");
  });

  it("says so when nothing is found", async () => {
    const none = async (): Promise<CheckResult> => ({ status: "not-found" });
    expect(describeFindings(await findProfiles("example_user", { check: none }))).toMatch(
      /^No profile for @example_user on the \d+ sites that answered/,
    );
  });
});
