import { describe, expect, it } from "vitest";
import {
  SalesforceCliError,
  buildCliEnvironment,
  buildRestArgs,
  isRetryableCliStartupError,
  withJsonArgs,
} from "../cli";

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

  it("retries only transient Salesforce CLI plugin startup failures", () => {
    expect(
      isRetryableCliStartupError(
        new SalesforceCliError(
          "Error Plugin: @salesforce/cli: could not find package.json with { name: '@salesforce/plugin-release-management' }",
        ),
      ),
    ).toBe(true);
    expect(isRetryableCliStartupError(new SalesforceCliError("INVALID_SESSION_ID"))).toBe(false);
    expect(isRetryableCliStartupError(new SalesforceCliError("Malformed SOQL query"))).toBe(false);
  });

  it("does not pass Raycast's Node development environment into Salesforce CLI", () => {
    const environment = buildCliEnvironment({
      NODE_ENV: "development",
      NODE_PATH: "/Applications/Raycast.app/example/node_modules",
      NODE_OPTIONS: "--require raycast-example",
      HOME: "/Users/example",
    });

    expect(environment.NODE_ENV).toBe("production");
    expect(environment.NODE_PATH).toBeUndefined();
    expect(environment.NODE_OPTIONS).toBeUndefined();
    expect(environment.HOME).toBe("/Users/example");
    expect(environment.SF_AUTOUPDATE_DISABLE).toBe("true");
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
