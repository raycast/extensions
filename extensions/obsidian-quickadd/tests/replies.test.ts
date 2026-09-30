import { describe, expect, it } from "vitest";
import {
  dateDefault,
  dateReply,
  dropdownDefault,
  FieldSpec,
  fieldValue,
  messageMarkdown,
  promptTitle,
  QaField,
  replyForForm,
  specsForPrompt,
  specsFromQuickAddFields,
  unsupportedMarkdown,
  validateForm,
} from "../src/replies";

// Shape recorded in the CLI spike: a capture with a text input and a capture-target picker.
const pickerForm: QaField[] = [
  { id: "Note", label: "Note", type: "text", optional: false },
  {
    id: "__qa.captureTargetFilePath.abc",
    label: "Select capture target file",
    type: "dropdown",
    options: ["A/one.md", "two.md"],
    displayOptions: ["one", "two"],
  },
];

describe("specsFromQuickAddFields", () => {
  it("maps text and dropdown fields", () => {
    expect(specsFromQuickAddFields(pickerForm)).toEqual([
      { id: "Note", label: "Note", kind: "text", optional: false },
      {
        id: "__qa.captureTargetFilePath.abc",
        label: "Select capture target file",
        kind: "dropdown",
        options: [
          { value: "A/one.md", title: "one" },
          { value: "two.md", title: "two" },
        ],
        allowCustom: false,
        optional: false,
      },
    ]);
  });

  it.each([
    [{ id: "a", type: "textarea" }, "textarea"],
    [{ id: "a", type: "suggester" }, "text"],
    [{ id: "a", type: "suggester", options: ["x"] }, "dropdown"],
    [{ id: "a", type: "field-suggest", options: ["x"], suggesterConfig: { multiSelect: true } }, "tags"],
    [{ id: "a", type: "date" }, "date"],
    [{ id: "a", type: "number" }, "number"],
    [{ id: "a", type: "slider" }, "number"],
    [{ id: "a", type: "checkbox" }, "checkbox"],
    [{ id: "a", type: "some-future-type" }, "text"],
    [{ id: "a" }, "text"],
  ])("maps %j to %s", (field, kind) => {
    expect(specsFromQuickAddFields([field as QaField])[0].kind).toBe(kind);
  });

  it("uses a date-time picker when the date format has a time", () => {
    const [timed, dated] = specsFromQuickAddFields([
      { id: "a", type: "date", dateFormat: "YYYY-MM-DD HH:mm" },
      { id: "b", type: "date", dateFormat: "dddd, MMMM Do" },
    ]);
    expect(timed).toMatchObject({ kind: "date", withTime: true });
    expect(dated.withTime).toBeFalsy();
    expect(specsForPrompt({ type: "date", dateFormat: "YYYY-MM-DD h:mm a" })![0].withTime).toBe(true);
  });

  it("keeps labels, defaults and custom input", () => {
    const [spec] = specsFromQuickAddFields([
      { id: "c", type: "suggester", options: ["x"], defaultValue: "x", suggesterConfig: { allowCustomInput: true } },
    ]);
    expect(spec).toMatchObject({ label: "c", defaultValue: "x", allowCustom: true });
  });
});

describe("specsForPrompt", () => {
  it("turns single prompts into one-field forms", () => {
    expect(specsForPrompt({ type: "input", header: "Title", multiline: true })).toEqual([
      { id: "value", label: "Title", kind: "textarea", optional: true },
    ]);
    expect(specsForPrompt({ type: "date", header: "When", withTime: true })).toEqual([
      { id: "value", label: "When", kind: "date", withTime: true, optional: true },
    ]);
    expect(
      specsForPrompt({
        type: "checkbox",
        items: [
          { title: "One", value: "1", checked: true },
          { title: "Two", value: "2" },
        ],
      }),
    ).toEqual([
      { id: "1", label: "One", kind: "checkbox", defaultValue: true, optional: true },
      { id: "2", label: "Two", kind: "checkbox", defaultValue: false, optional: true },
    ]);
    expect(
      specsForPrompt({
        type: "multiselect",
        items: [{ title: "A", value: "a" }],
        preselected: ["a"],
        allowCustomInput: true,
      }),
    ).toEqual([
      {
        id: "value",
        label: "Select",
        kind: "tags",
        options: [{ value: "a", title: "A" }],
        defaultValue: ["a"],
        allowCustom: true,
        optional: true,
      },
    ]);
  });

  it("returns undefined for prompts that are not forms", () => {
    for (const type of ["suggester", "confirm", "info", "some-future-prompt"]) {
      expect(specsForPrompt({ type })).toBeUndefined();
    }
  });
});

describe("fieldValue and replyForForm", () => {
  const text: FieldSpec = { id: "t", label: "t", kind: "text", optional: false };
  const drop: FieldSpec = {
    id: "d",
    label: "d",
    kind: "dropdown",
    options: [{ value: "x", title: "X" }],
    allowCustom: true,
    optional: false,
  };

  it("prefers a custom value over the dropdown", () => {
    expect(fieldValue(drop, { f0: "x", "f0-custom": "  mine " }, 0)).toBe("mine");
    expect(fieldValue(drop, { f0: "x", "f0-custom": "" }, 0)).toBe("x");
  });

  it("builds a form reply keyed by QuickAdd field ids", () => {
    const specs = specsFromQuickAddFields(pickerForm);
    expect(replyForForm({ type: "form", fields: pickerForm }, specs, { f0: "hello", f1: "two.md" })).toEqual({
      Note: "hello",
      "__qa.captureTargetFilePath.abc": "two.md",
    });
  });

  it("builds input, date, checkbox and multiselect replies", () => {
    expect(replyForForm({ type: "input" }, [text], { f0: "hi" })).toBe("hi");
    const date: FieldSpec = { id: "value", label: "d", kind: "date", optional: true };
    expect(replyForForm({ type: "date" }, [date], { f0: new Date(2026, 8, 30, 15, 0) })).toBe("@date:2026-09-30");
    const boxes = specsForPrompt({
      type: "checkbox",
      items: [
        { title: "1", value: "1" },
        { title: "2", value: "2" },
      ],
    })!;
    expect(replyForForm({ type: "checkbox" }, boxes, { f0: false, f1: true })).toEqual(["2"]);
    const tags = specsForPrompt({ type: "multiselect", items: [{ title: "A", value: "a" }], allowCustomInput: true })!;
    expect(replyForForm({ type: "multiselect" }, tags, { f0: ["a"], "f0-custom": "b, c" })).toEqual(["a", "b", "c"]);
  });

  it("sends checkbox form fields as true/false strings", () => {
    const [box] = specsFromQuickAddFields([{ id: "done", type: "checkbox" }]);
    expect(fieldValue(box, { f0: true }, 0)).toBe("true");
    expect(fieldValue(box, {}, 0)).toBe("false");
  });
});

describe("validateForm", () => {
  it("requires non-optional values and numeric numbers", () => {
    const specs: FieldSpec[] = [
      { id: "a", label: "a", kind: "text", optional: false },
      { id: "b", label: "b", kind: "text", optional: true },
      { id: "c", label: "c", kind: "number", optional: true },
      { id: "d", label: "d", kind: "checkbox", optional: false },
    ];
    expect(validateForm(specs, { f0: " ", f1: "", f2: "abc", f3: false })).toEqual({
      0: "Required",
      2: "Must be a number",
    });
    expect(validateForm(specs, { f0: "x", f2: "4.5" })).toEqual({});
  });
});

describe("number ranges", () => {
  it("keeps QuickAdd's min/max and enforces them", () => {
    const [count] = specsFromQuickAddFields([{ id: "count", type: "number", numericConfig: { min: 0, max: 10 } }]);
    expect(count).toMatchObject({ kind: "number", min: 0, max: 10 });
    expect(validateForm([count], { f0: "42" })).toEqual({ 0: "Must be between 0 and 10" });
    expect(validateForm([count], { f0: "-1" })).toEqual({ 0: "Must be between 0 and 10" });
    expect(validateForm([count], { f0: "7" })).toEqual({});
    const [floor] = specsFromQuickAddFields([{ id: "n", type: "slider", numericConfig: { min: 1 } }]);
    expect(validateForm([floor], { f0: "0" })).toEqual({ 0: "Must be at least 1" });
  });
});

describe("helpers", () => {
  it("formats dates for QuickAdd", () => {
    expect(dateReply(new Date(2026, 0, 5, 9, 30), false)).toBe("@date:2026-01-05");
    // With a time: readable local wall-clock time plus the UTC offset, for the same instant.
    const picked = new Date(2026, 0, 5, 9, 30);
    const timed = dateReply(picked, true);
    expect(timed).toMatch(/^@date:2026-01-05T09:30:00[+-]\d\d:\d\d$/);
    expect(Date.parse(timed.slice("@date:".length))).toBe(picked.getTime());
  });

  it("offers no value for an optional dropdown without a default", () => {
    const opts = [{ value: "x", title: "X" }];
    expect(dropdownDefault({ id: "a", label: "a", kind: "dropdown", options: opts, optional: true })).toBe("");
    expect(
      dropdownDefault({ id: "a", label: "a", kind: "dropdown", options: opts, optional: true, defaultValue: "x" }),
    ).toBe("x");
    const spec: FieldSpec = { id: "a", label: "a", kind: "dropdown", options: opts, optional: true };
    expect(fieldValue(spec, { f0: "" }, 0)).toBe("");
    expect(validateForm([spec], { f0: "" })).toEqual({});
  });

  it("picks dropdown and date defaults", () => {
    const opts = [
      { value: "x", title: "X" },
      { value: "y", title: "Y" },
    ];
    expect(
      dropdownDefault({ id: "a", label: "a", kind: "dropdown", options: opts, defaultValue: "y", optional: false }),
    ).toBe("y");
    expect(
      dropdownDefault({ id: "a", label: "a", kind: "dropdown", options: opts, defaultValue: "z", optional: false }),
    ).toBe("x");
    // Date-only values are local calendar days (not UTC midnight, which is the previous day west of UTC).
    const day = dateDefault("@date:2026-09-30");
    expect([day?.getFullYear(), day?.getMonth(), day?.getDate(), day?.getHours()]).toEqual([2026, 8, 30, 0]);
    expect(dateDefault("2026-01-05")?.getDate()).toBe(5);
    expect(dateDefault("@date:2026-09-30T14:30:00Z")?.getTime()).toBe(Date.parse("2026-09-30T14:30:00Z"));
    expect(dateDefault("not a date")).toBeUndefined();
    expect(dateDefault(undefined)).toBeUndefined();
  });

  it("titles and describes prompts", () => {
    expect(promptTitle({ type: "input", header: " Title " }, "Choice")).toBe("Title");
    expect(promptTitle({ type: "suggester", placeholder: "Pick" }, "Choice")).toBe("Pick");
    expect(promptTitle({ type: "form" }, "Choice")).toBe("Choice");
    expect(messageMarkdown({ type: "info", header: "Heads up", text: ["one", "two"] })).toBe(
      "## Heads up\n\none\n\ntwo",
    );
    expect(messageMarkdown({ type: "confirm", text: "Sure?" })).toBe("Sure?");
    expect(unsupportedMarkdown("hologram")).toContain("`hologram`");
  });
});
