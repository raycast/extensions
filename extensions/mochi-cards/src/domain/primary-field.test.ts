import { describe, expect, it } from "vitest";

import { ensurePrimaryInputField, ensurePrimaryMochiBinding } from "./primary-field";

describe("primary card field", () => {
  it("creates a required text field when a template has no inputs", () => {
    expect(ensurePrimaryInputField([])).toEqual([
      { id: "primary-name", name: "Name", type: "text", required: true, multiline: false },
    ]);
  });

  it("makes an existing first field required and converts boolean to text", () => {
    expect(ensurePrimaryInputField([{ id: "word", name: "Word", type: "number", required: false }])[0]).toEqual({
      id: "word",
      name: "Word",
      type: "number",
      required: true,
    });
    expect(ensurePrimaryInputField([{ id: "word", name: "Word", type: "boolean" }])[0]).toEqual({
      id: "word",
      name: "Word",
      type: "text",
      required: true,
      multiline: false,
    });
  });

  it("always maps the first input to the Mochi name field", () => {
    const fields = [{ id: "word", name: "Word", type: "text", required: true, multiline: false }] as const;
    const template = {
      id: "remote",
      name: "Remote",
      fields: [{ id: "name", name: "Name", type: "text", multiline: false }],
    };

    expect(
      ensurePrimaryMochiBinding(fields, template, [{ kind: "custom", targetFieldId: "name", template: "wrong" }])
    ).toEqual([{ kind: "input", targetFieldId: "name", sourceFieldId: "word" }]);
  });

  it("preserves an existing name mapping by moving its input to the primary position", () => {
    const fields = [
      { id: "other", name: "Other", type: "text", required: false, multiline: false },
      { id: "word", name: "Word", type: "number", required: false },
    ] as const;

    expect(ensurePrimaryInputField(fields, "word")).toEqual([
      { id: "word", name: "Word", type: "number", required: true },
      fields[0],
    ]);
  });
});
