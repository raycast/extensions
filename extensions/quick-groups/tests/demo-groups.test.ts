import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseReferenceYaml } from "../src/parser";

describe("showcase dataset", () => {
  it("loads every demo group and demonstrates the standard action families", async () => {
    const file = path.join(process.cwd(), "examples", "demo-groups.yaml");
    const result = parseReferenceYaml(await readFile(file, "utf8"), file);

    expect(result.diagnostics).toEqual([]);
    expect(result.records).toHaveLength(8);
    expect(new Set(result.records.map((record) => record.collection))).toEqual(
      new Set(["projects", "machines", "writing", "clients"]),
    );

    const actions = result.records.flatMap((record) =>
      record.fields.flatMap((field) => field.actions.map((action) => action.kind)),
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "open",
        "ssh",
        "obsidian",
        "pwd",
        "application/Terminal",
        "application/Finder",
        "application/Visual Studio Code",
        "application/Scrivener",
        "raycast/script/open-project",
      ]),
    );
  });
});
