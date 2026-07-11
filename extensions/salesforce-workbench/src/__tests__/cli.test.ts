import { describe, expect, it } from "vitest";
import { SalesforceCliError, buildRestArgs, withJsonArgs } from "../cli";

describe("Salesforce CLI wrapper", () => {
  it("adds the JSON flag once", () => {
    expect(withJsonArgs(["org", "list"])).toEqual(["org", "list", "--json"]);
    expect(withJsonArgs(["org", "list", "--json"])).toEqual(["org", "list", "--json"]);
  });

  it("preserves CLI error context", () => {
    const error = new SalesforceCliError("Expired authentication", "INVALID_SESSION_ID", 1);
    expect(error.name).toBe("SalesforceCliError");
    expect(error.stderr).toBe("INVALID_SESSION_ID");
    expect(error.exitCode).toBe(1);
  });

  it("streams JSON bodies and supplies an explicit empty DELETE body", () => {
    expect(buildRestArgs("ExampleSandbox", "POST", "/sobjects/Account", true)).toEqual([
      "api",
      "request",
      "rest",
      "/sobjects/Account",
      "--target-org",
      "ExampleSandbox",
      "--method",
      "POST",
      "--body",
      "-",
    ]);
    expect(buildRestArgs("ExampleSandbox", "DELETE", "/sobjects/Account/001", false).slice(-2)).toEqual([
      "--body",
      "{}",
    ]);
  });
});
