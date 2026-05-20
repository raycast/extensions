import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseListOutput, parseSearchOutput, parseUpgradeOutput } from "../src/utils/winget-parser";

describe("winget parser", () => {
  test("parses installed package list", () => {
    const output = [
      "Name                 Id                            Version       Source",
      "---------------------------------------------------------------------",
      "Visual Studio Code   Microsoft.VisualStudioCode    1.85.0        winget",
      "Google Chrome        Google.Chrome                 120.0.6099    winget",
    ].join("\n");

    const result = parseListOutput(output);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.packages, [
      {
        name: "Visual Studio Code",
        id: "Microsoft.VisualStudioCode",
        version: "1.85.0",
        availableVersion: undefined,
        source: "winget",
      },
      {
        name: "Google Chrome",
        id: "Google.Chrome",
        version: "120.0.6099",
        availableVersion: undefined,
        source: "winget",
      },
    ]);
  });

  test("parses available upgrades", () => {
    const output = [
      "Name                 Id                            Version       Available    Source",
      "----------------------------------------------------------------------------------",
      "Visual Studio Code   Microsoft.VisualStudioCode    1.85.0        1.86.0       winget",
    ].join("\n");

    const result = parseUpgradeOutput(output);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.packages, [
      {
        name: "Visual Studio Code",
        id: "Microsoft.VisualStudioCode",
        version: "1.85.0",
        availableVersion: "1.86.0",
        source: "winget",
      },
    ]);
  });

  test("returns an empty result for no matches", () => {
    const result = parseSearchOutput("No package found matching input criteria.");

    assert.equal(result.error, undefined);
    assert.deepEqual(result.packages, []);
  });

  test("ignores carriage-return progress output", () => {
    const output = [
      "   - \r   \\ \rName                 Id                            Version       Source",
      "---------------------------------------------------------------------",
      "Node.js              OpenJS.NodeJS.LTS               24.14.0       winget",
    ].join("\n");

    const result = parseListOutput(output);

    assert.equal(result.error, undefined);
    assert.deepEqual(result.packages, [
      {
        name: "Node.js",
        id: "OpenJS.NodeJS.LTS",
        version: "24.14.0",
        availableVersion: undefined,
        source: "winget",
      },
    ]);
  });
});
