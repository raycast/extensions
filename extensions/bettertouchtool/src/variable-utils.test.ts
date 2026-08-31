import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterVariableDefinitions, getPersistentVariableNames, mergeVariableDefinitions } from "./variable-utils";

const filterFixture = [
  { name: "DynamicValue", category: "Dynamic", persistent: false, readOnly: true },
  { name: "ContextValue", category: "Context", persistent: false, readOnly: true },
  { name: "PersistentValue", category: "Persistent", persistent: true, readOnly: false },
] as const;

describe("variable filtering", () => {
  it("returns all variables by default", () => {
    assert.deepEqual(filterVariableDefinitions(filterFixture, "all"), filterFixture);
  });

  it("filters each variable category", () => {
    assert.deepEqual(
      filterVariableDefinitions(filterFixture, "dynamic").map((variable) => variable.name),
      ["DynamicValue"],
    );
    assert.deepEqual(
      filterVariableDefinitions(filterFixture, "context").map((variable) => variable.name),
      ["ContextValue"],
    );
    assert.deepEqual(
      filterVariableDefinitions(filterFixture, "persistent").map((variable) => variable.name),
      ["PersistentValue"],
    );
  });
});

describe("persistent variable files", () => {
  it("reads names from the current nested plist shape", () => {
    assert.deepEqual(getPersistentVariableNames({ BTTUserVariables: { Count: 1, Greeting: "Hello" } }), [
      "Count",
      "Greeting",
    ]);
  });

  it("supports the legacy root plist shape", () => {
    assert.deepEqual(getPersistentVariableNames({ Count: 1, Greeting: "Hello" }), ["Count", "Greeting"]);
  });

  it("rejects non-object roots", () => {
    assert.deepEqual(getPersistentVariableNames(null), []);
    assert.deepEqual(getPersistentVariableNames(["not", "variables"]), []);
  });
});

describe("variable catalog merging", () => {
  it("adds writable persistent variables, replaces duplicate standard entries, and sorts by name", () => {
    const variables = mergeVariableDefinitions(["Zulu", "OutputVolume", "Alpha"]);
    const names = variables.map((variable) => variable.name);
    const outputVolume = variables.find((variable) => variable.name === "OutputVolume");

    assert.equal(names.indexOf("Alpha") < names.indexOf("Zulu"), true);
    assert.equal(names.filter((name) => name === "OutputVolume").length, 1);
    assert.deepEqual(outputVolume, {
      name: "OutputVolume",
      category: "Persistent",
      persistent: true,
      readOnly: false,
    });
  });
});
