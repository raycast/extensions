import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActionDefinition, ActionParamDoc } from "bettertouchtool/catalog";
import {
  formatInitialValue,
  getParameterFields,
  inferParameterKind,
  parseFormValue,
  type ParameterField,
  type ParameterKind,
} from "./action-parameters";

describe("action parameter metadata", () => {
  it("deduplicates parameters and omits the predefined action type", () => {
    const duplicate = parameter("value", "A string value");
    const definition: ActionDefinition = {
      id: 42,
      name: "Example",
      slug: "example",
      category: "Tests",
      description: "Example action",
      params: [parameter("BTTPredefinedActionType", "Action type"), duplicate, duplicate],
      example: { value: "hello" },
    };

    assert.deepEqual(getParameterFields(definition), [{ definition: duplicate, initialValue: "hello", kind: "text" }]);
  });

  it("infers supported types and falls back to raw JSON for ambiguous metadata", () => {
    assert.equal(inferParameterKind(parameter("enabled", "Boolean flag"), undefined), "boolean");
    assert.equal(inferParameterKind(parameter("delay", "Delay in seconds"), undefined), "number");
    assert.equal(inferParameterKind(parameter("title", "Title"), "Hello"), "text");
    assert.equal(
      inferParameterKind(parameter("config", "Configuration", [parameter("name", "Name")]), undefined),
      "json",
    );
    assert.equal(inferParameterKind(parameter("unknown", "Undocumented value"), undefined), "raw-json");
  });
});

describe("action parameter values", () => {
  it("formats JSON defaults and primitive defaults", () => {
    assert.equal(formatInitialValue({ enabled: true }, "json"), '{\n  "enabled": true\n}');
    assert.equal(formatInitialValue("hello", "raw-json"), '"hello"');
    assert.equal(formatInitialValue(3, "number"), "3");
    assert.equal(formatInitialValue(undefined, "text"), "");
  });

  it("omits empty values and untouched optional checkboxes", () => {
    assert.equal(parseFormValue("  ", field("text")), undefined);
    assert.equal(parseFormValue(false, field("boolean")), undefined);
    assert.equal(parseFormValue(false, field("boolean", true)), false);
  });

  it("parses numeric and raw JSON values", () => {
    assert.equal(parseFormValue("12.5", field("number")), 12.5);
    assert.deepEqual(parseFormValue('{"enabled":true}', field("raw-json")), { enabled: true });
    assert.equal(parseFormValue('"quoted string"', field("raw-json")), "quoted string");
  });

  it("reports the parameter name for invalid values", () => {
    assert.throws(() => parseFormValue("not a number", field("number")), /BTTTestValue must be a valid number/);
    assert.throws(() => parseFormValue("not json", field("raw-json")), /BTTTestValue must be a valid JSON value/);
  });
});

function parameter(key: string, description: string, children?: ActionParamDoc[]): ActionParamDoc {
  return { key, description, children };
}

function field(kind: ParameterKind, initialValue?: unknown): ParameterField {
  return { definition: parameter("BTTTestValue", "Test value"), initialValue, kind };
}
