import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getNamedTriggerInputDefinitions,
  getNamedTriggerInputFieldId,
  parseNamedTriggerInputValues,
} from "./named-trigger-inputs";

describe("named trigger input definitions", () => {
  const config = {
    BTTNamedTriggerAIRequiresVariables: true,
    BTTNamedTriggerAIVar1Name: "Environment",
    BTTNamedTriggerAIVar1Type: 0,
    BTTNamedTriggerAIVar1Description: "Deployment target",
    BTTNamedTriggerAIVar1Options: "Development\nStaging\nProduction",
    BTTNamedTriggerAIVar2Name: "Retries",
    BTTNamedTriggerAIVar2Type: 1,
  };

  it("extracts text, number, description, and option metadata", () => {
    assert.deepEqual(getNamedTriggerInputDefinitions(config), [
      {
        name: "Environment",
        type: "text",
        description: "Deployment target",
        options: ["Development", "Staging", "Production"],
      },
      { name: "Retries", type: "number", options: [] },
    ]);
  });

  it("supports BTT configurations returned as JSON strings", () => {
    assert.deepEqual(getNamedTriggerInputDefinitions(JSON.stringify(config)), getNamedTriggerInputDefinitions(config));
  });

  it("ignores malformed and unrelated configurations", () => {
    assert.deepEqual(getNamedTriggerInputDefinitions(undefined), []);
    assert.deepEqual(getNamedTriggerInputDefinitions("not json"), []);
    assert.deepEqual(getNamedTriggerInputDefinitions({ BTTNamedTriggerAIRequiresVariables: true }), []);
  });
});

describe("named trigger input values", () => {
  const definitions = getNamedTriggerInputDefinitions({
    BTTNamedTriggerAIVar1Name: "Label",
    BTTNamedTriggerAIVar1Type: "text",
    BTTNamedTriggerAIVar2Name: "Count",
    BTTNamedTriggerAIVar2Type: "number",
  });

  it("preserves text verbatim and parses finite numbers", () => {
    assert.deepEqual(
      parseNamedTriggerInputValues(definitions, {
        [getNamedTriggerInputFieldId(0)]: " 001-Alpha ",
        [getNamedTriggerInputFieldId(1)]: "2.5",
      }),
      { success: true, variables: { Label: " 001-Alpha ", Count: 2.5 } },
    );
  });

  it("rejects empty and invalid number inputs", () => {
    assert.equal(
      parseNamedTriggerInputValues(definitions, {
        [getNamedTriggerInputFieldId(0)]: "value",
        [getNamedTriggerInputFieldId(1)]: "",
      }).success,
      false,
    );
    assert.equal(
      parseNamedTriggerInputValues(definitions, {
        [getNamedTriggerInputFieldId(0)]: "value",
        [getNamedTriggerInputFieldId(1)]: "Infinity",
      }).success,
      false,
    );
  });
});
