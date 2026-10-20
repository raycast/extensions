import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CustomFieldSchema, getCustomFieldValue } from "../src/helpers/customFields.ts";

describe("getCustomFieldValue", () => {
  it("returns the plain Team ID string for the Advanced Roadmaps team field", () => {
    const result = getCustomFieldValue(CustomFieldSchema.team, "abc-123-team-uuid");
    assert.equal(result, "abc-123-team-uuid");
  });

  it("returns the plain Team ID string for the Atlassian Teams platform field", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.atlassianTeam, "team-uuid-99"), "team-uuid-99");
  });

  it("returns { id } for userPicker", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.userPicker, "user-account-id"), {
      id: "user-account-id",
    });
  });

  it("returns { id } for select", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.select, "option-id-42"), { id: "option-id-42" });
  });

  it("returns { id } for radioButtons", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.radioButtons, "radio-id"), { id: "radio-id" });
  });

  it("returns a plain string for textfield", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.textfield, "hello world"), "hello world");
  });

  it("returns a plain string for epicLabel", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.epicLabel, "my-epic"), "my-epic");
  });

  it("returns an array of { id } objects for multiSelect", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.multiSelect, ["id-1", "id-2", "id-3"]), [
      { id: "id-1" },
      { id: "id-2" },
      { id: "id-3" },
    ]);
  });

  it("returns an empty array for an empty multiSelect", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.multiSelect, []), []);
  });

  it("returns an array of { id } objects for multiCheckboxes", () => {
    assert.deepEqual(getCustomFieldValue(CustomFieldSchema.multiCheckboxes, ["a", "b"]), [{ id: "a" }, { id: "b" }]);
  });

  it("returns a parsed integer for float", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.float, "3"), 3);
  });

  it("returns a parsed integer for storyPointEstimate", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.storyPointEstimate, "8"), 8);
  });

  it("returns a parsed integer for sprint", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.sprint, "42"), 42);
  });

  it("returns null for an unknown schema", () => {
    assert.equal(getCustomFieldValue(CustomFieldSchema.unknown, "anything"), null);
  });
});
