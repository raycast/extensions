import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describePortlessError, parsePortlessListOutput } from "../src/portless.ts";

describe("parsePortlessListOutput", () => {
  it("extracts active route URLs from Portless output", () => {
    const stdout = `
Active routes:

  http://dev.localhost  ->  localhost:4102  (pid 98977)
  https://dashboard.localhost  ->  localhost:4241  (pid 85572)
`;

    assert.deepEqual(parsePortlessListOutput(stdout), ["http://dev.localhost", "https://dashboard.localhost"]);
  });

  it("ignores output without routes", () => {
    assert.deepEqual(parsePortlessListOutput("No active routes."), []);
  });
});

describe("describePortlessError", () => {
  it("directs missing executable errors to the preference", () => {
    const description = describePortlessError(
      new Error("spawn /Users/example/bin/portless ENOENT"),
      "/Users/example/bin/portless",
    );

    assert.equal(
      description,
      "Could not find /Users/example/bin/portless. Set Portless Executable in this extension's preferences.",
    );
  });

  it("explains a file that is not executable", () => {
    const description = describePortlessError(
      new Error("spawn /Users/example/notes.txt EACCES"),
      "/Users/example/notes.txt",
    );

    assert.equal(
      description,
      "/Users/example/notes.txt is not executable. Pick a different file, or make it executable with chmod +x.",
    );
  });

  it("preserves other command errors", () => {
    assert.equal(
      describePortlessError(new Error("Command failed with exit code 1"), "portless"),
      "Command failed with exit code 1",
    );
  });
});
