import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseTable } from "../src/utils/winget/parse";

function parseListOutput(output: string) {
  return parseTable(output).map((row) => ({
    name: row["Name"] ?? "",
    id: row["Id"] ?? "",
    version: row["Version"] ?? "",
    availableVersion: row["Available"] ?? undefined,
    source: row["Source"] ?? undefined,
  }));
}

function parseUpgradeOutput(output: string) {
  return parseTable(output).map((row) => ({
    name: row["Name"] ?? "",
    id: row["Id"] ?? "",
    version: row["Version"] ?? "",
    availableVersion: row["Available"] ?? undefined,
    source: row["Source"] ?? undefined,
  }));
}

function parseSearchOutput(output: string) {
  return parseTable(output).map((row) => ({
    name: row["Name"] ?? "",
    id: row["Id"] ?? "",
    version: row["Version"] ?? "",
    availableVersion: row["Available"] ?? undefined,
    source: row["Source"] ?? undefined,
  }));
}

describe("winget parser", () => {
  test("parses installed package list", () => {
    const output = [
      "Name                 Id                            Version       Source",
      "---------------------------------------------------------------------",
      "Visual Studio Code   Microsoft.VisualStudioCode    1.85.0        winget",
      "Google Chrome        Google.Chrome                 120.0.6099    winget",
    ].join("\n");

    const result = parseListOutput(output);

    assert.deepEqual(result, [
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

    assert.deepEqual(result, [
      {
        name: "Visual Studio Code",
        id: "Microsoft.VisualStudioCode",
        version: "1.85.0",
        availableVersion: "1.86.0",
        source: "winget",
      },
    ]);
  });

  test("parses localized headers by column position", () => {
    const output = [
      "Имя                  ИД                            Версия        Доступно     Источник",
      "-----------------------------------------------------------------------------------",
      "Visual Studio Code   Microsoft.VisualStudioCode    1.85.0        1.86.0       winget",
    ].join("\n");

    const result = parseUpgradeOutput(output);

    assert.deepEqual(result, [
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

    assert.deepEqual(result, []);
  });

  test("ignores carriage-return progress output", () => {
    const output = [
      "   - \r   \\ \rName                 Id                            Version       Source",
      "---------------------------------------------------------------------",
      "Node.js              OpenJS.NodeJS.LTS               24.14.0       winget",
    ].join("\n");

    const result = parseListOutput(output);

    assert.deepEqual(result, [
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
