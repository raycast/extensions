import { describe, expect, it } from "vitest";
import {
  type FieldSpec,
  fieldSpecFromForm,
  fieldSpecFromPrompt,
  readField,
} from "./fields";
import type { FormField } from "./interactive";

function field(overrides: Partial<FormField>): FormField {
  return { id: "f", label: "Field", type: "text", ...overrides };
}

describe("fieldSpecFromForm", () => {
  it("turns a file-picker suggester into a note picker titled by display names", () => {
    const spec = fieldSpecFromForm(
      field({
        type: "suggester",
        picker: "file",
        options: ["People/Ada.md", "People/Bob.md"],
        displayOptions: ["Ada", "Bob"],
      }),
    );
    expect(spec).toMatchObject({
      kind: "select",
      notePicker: true,
      options: [
        { value: "People/Ada.md", title: "Ada" },
        { value: "People/Bob.md", title: "Bob" },
      ],
    });
  });

  it("turns a multiSelect suggester into a multi field that allows custom values", () => {
    const spec = fieldSpecFromForm(
      field({
        type: "suggester",
        options: ["a", "b"],
        suggesterConfig: { multiSelect: true, allowCustomInput: true },
      }),
    );
    expect(spec).toMatchObject({ kind: "multi", allowCustom: true });
  });

  it.each([
    [["a", "b"], "a", ["a"]],
    [["a", "b"], "a, c", ["a"]],
    [["a", "b"], "a, b", ["a", "b"]],
    [["a", "b", "a, b"], "a, b", ["a, b"]],
  ])(
    "with options %j preselects multi default %j as %j",
    (options, defaultValue, preselected) => {
      const spec = fieldSpecFromForm(
        field({
          type: "suggester",
          options,
          defaultValue,
          suggesterConfig: { multiSelect: true },
        }),
      );
      expect(spec).toMatchObject({ kind: "multi", preselected });
    },
  );

  it("renders a field-suggest without options as free text", () => {
    expect(fieldSpecFromForm(field({ type: "field-suggest" })).kind).toBe(
      "text",
    );
  });

  it("carries a slider's numeric range", () => {
    expect(
      fieldSpecFromForm(
        field({ type: "slider", numericConfig: { min: 1, max: 5 } }),
      ),
    ).toMatchObject({ kind: "number", min: 1, max: 5 });
  });

  it.each([
    ["YYYY-MM-DD HH:mm", true],
    ["YYYY-MM-DDTHH:mm", true],
    ["YYYY-MM-DD", false],
    ["dddd, MMMM Do, YYYY", false],
    ["[H]YYYY-MM-DD", false],
    ["gggg.MM.[Wk]w", false],
  ])("date format %s has a time picker: %s", (dateFormat, withTime) => {
    expect(fieldSpecFromForm(field({ type: "date", dateFormat }))).toEqual(
      expect.objectContaining({ kind: "date", withTime }),
    );
  });
});

describe("fieldSpecFromPrompt", () => {
  it("lets a date prompt's withTime flag turn on the time picker", () => {
    expect(
      fieldSpecFromPrompt({ type: "date", header: "When", withTime: true }),
    ).toMatchObject({ kind: "date", withTime: true });
  });

  it("derives the time picker from a date prompt's format", () => {
    expect(
      fieldSpecFromPrompt({
        type: "date",
        header: "When",
        dateFormat: "YYYY-MM-DD HH:mm",
      }),
    ).toMatchObject({ kind: "date", withTime: true });
  });
});

describe("readField", () => {
  const notePicker: FieldSpec = {
    id: "target",
    label: "Note",
    optional: false,
    kind: "select",
    notePicker: true,
    allowCustom: false,
    options: [{ value: "a.md", title: "a" }],
  };

  it("rejects a required note picker with no pick", () => {
    expect(readField(notePicker, "", undefined)).toEqual({
      ok: false,
      error: "Required",
    });
  });

  it("accepts an optional note picker with no pick", () => {
    expect(readField({ ...notePicker, optional: true }, "", undefined)).toEqual(
      { ok: true, value: "" },
    );
  });

  it("lets custom text override the dropdown pick", () => {
    const spec: FieldSpec = {
      ...notePicker,
      notePicker: false,
      allowCustom: true,
    };
    expect(readField(spec, "a.md", "  purple ")).toEqual({
      ok: true,
      value: "purple",
    });
    expect(readField(spec, "a.md", "  ")).toEqual({ ok: true, value: "a.md" });
  });

  const multi: FieldSpec = {
    id: "tags",
    label: "Tags",
    optional: false,
    kind: "multi",
    allowCustom: true,
    options: [],
    preselected: [],
  };

  it("returns multi picks as an array and appends custom entries", () => {
    expect(readField(multi, ["alpha", "beta"], "gamma, , delta ")).toEqual({
      ok: true,
      value: ["alpha", "beta", "gamma", "delta"],
    });
  });

  it("rejects a required multi field with nothing picked", () => {
    expect(readField(multi, [], " , ")).toEqual({
      ok: false,
      error: "Required",
    });
  });

  const number: FieldSpec = {
    id: "n",
    label: "N",
    optional: false,
    kind: "number",
    min: 1,
    max: 5,
  };

  it.each([
    [number, "9", "Between 1 and 5"],
    [{ ...number, max: undefined }, "0", "At least 1"],
    [{ ...number, min: undefined }, "6", "At most 5"],
    [number, "three", "Enter a number"],
    [number, "  ", "Required"],
  ] as const)("rejects number %#: %s -> %s", (spec, raw, error) => {
    expect(readField(spec, raw, undefined)).toEqual({ ok: false, error });
  });

  it("accepts a number in range as its trimmed text", () => {
    expect(readField(number, " 3 ", undefined)).toEqual({
      ok: true,
      value: "3",
    });
  });

  const text: FieldSpec = {
    id: "t",
    label: "T",
    optional: false,
    kind: "text",
    multiline: false,
  };

  it("rejects a blank required text field and accepts a blank optional one", () => {
    expect(readField(text, "   ", undefined)).toEqual({
      ok: false,
      error: "Required",
    });
    expect(readField({ ...text, optional: true }, "", undefined)).toEqual({
      ok: true,
      value: "",
    });
  });

  it("returns text exactly as typed, keeping leading and trailing whitespace", () => {
    expect(readField(text, "    indented code\n", undefined)).toEqual({
      ok: true,
      value: "    indented code\n",
    });
  });

  const date: FieldSpec = {
    id: "d",
    label: "D",
    optional: false,
    kind: "date",
    withTime: false,
  };

  it("sends a picked date as plain ISO and rejects a missing required date", () => {
    const picked = new Date("2026-10-04T09:30:00.000Z");
    expect(readField(date, picked, undefined)).toEqual({
      ok: true,
      value: "2026-10-04T09:30:00.000Z",
    });
    expect(readField(date, null, undefined)).toEqual({
      ok: false,
      error: "Required",
    });
  });
});
