import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterVariableDefinitions,
  formatVariableValuePreview,
  getPersistentVariableNames,
  isVariableSet,
  mergeVariableDefinitions,
  parseNewVariable,
} from "./variable-utils";

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

  it("filters variables to the names currently set in BTT", () => {
    assert.deepEqual(
      filterVariableDefinitions(filterFixture, "set", new Set(["DynamicValue", "PersistentValue"])).map(
        (variable) => variable.name,
      ),
      ["DynamicValue", "PersistentValue"],
    );
  });
});

describe("new variable values", () => {
  it("preserves names and string values verbatim", () => {
    assert.deepEqual(parseNewVariable({ name: " Build Label ", type: "string", value: " 001-Alpha " }), {
      success: true,
      name: " Build Label ",
      value: " 001-Alpha ",
    });
  });

  it("parses finite numeric values", () => {
    assert.deepEqual(parseNewVariable({ name: "Count", type: "number", value: "2.5" }), {
      success: true,
      name: "Count",
      value: 2.5,
    });
  });

  it("rejects missing names, duplicate names, and invalid numbers", () => {
    assert.equal(parseNewVariable({ name: " ", type: "string", value: "value" }).success, false);
    assert.equal(
      parseNewVariable({ name: "Existing", type: "string", value: "value" }, new Set(["Existing"])).success,
      false,
    );
    assert.equal(parseNewVariable({ name: "Count", type: "number", value: "" }).success, false);
    assert.equal(parseNewVariable({ name: "Count", type: "number", value: "Infinity" }).success, false);
  });
});

describe("set variable detection", () => {
  it("includes persistent variables even when their value is empty", () => {
    assert.equal(isVariableSet(filterFixture[2], "", "string"), true);
  });

  it("includes live values with a declared type or non-empty value", () => {
    assert.equal(isVariableSet(filterFixture[0], 0, "number"), true);
    assert.equal(isVariableSet(filterFixture[0], "active", "unset"), true);
  });

  it("excludes unset, empty dynamic and context variables", () => {
    assert.equal(isVariableSet(filterFixture[0], "", "unset"), false);
    assert.equal(isVariableSet(filterFixture[1], "", ""), false);
  });
});

describe("variable value previews", () => {
  it("formats numbers and empty strings", () => {
    assert.equal(formatVariableValuePreview(0), "0");
    assert.equal(formatVariableValuePreview(""), '""');
  });

  it("collapses whitespace and truncates long values", () => {
    assert.equal(formatVariableValuePreview("first\n  second"), "first second");
    assert.equal(formatVariableValuePreview("123456789", 6), "12345…");
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
