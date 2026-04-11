import { describe, expect, test } from "vitest";

import { selectPrimaryField } from "./selectPrimaryField";

const baseField = (overrides = {}) => ({
  id: "field-1",
  type: "TEXT",
  name: "name",
  label: "Name",
  description: null,
  isCustom: true,
  isActive: true,
  isSystem: false,
  isNullable: false,
  defaultValue: null,
  options: null,
  ...overrides,
});

const createObjectMetadata = (fields: Array<ReturnType<typeof baseField>>) => ({
  id: "person",
  dataSourceId: "source-1",
  nameSingular: "person",
  namePlural: "people",
  labelSingular: "Person",
  labelPlural: "People",
  description: null,
  isCustom: true,
  isActive: true,
  isSystem: false,
  fields,
});

describe("selectPrimaryField", () => {
  test("prefers field named name", () => {
    const objectRecordMetadata = createObjectMetadata([
      baseField({ id: "field-title", name: "title", label: "Title" }),
      baseField({ id: "field-name", name: "name", label: "Name" }),
      baseField({ id: "field-summary", name: "summary", label: "Summary" }),
    ]);

    expect(selectPrimaryField(objectRecordMetadata).name).toBe("name");
  });

  test("falls back to title when name is absent", () => {
    const objectRecordMetadata = createObjectMetadata([
      baseField({ id: "field-title", name: "title", label: "Title" }),
      baseField({ id: "field-summary", name: "summary", label: "Summary" }),
    ]);

    expect(selectPrimaryField(objectRecordMetadata).name).toBe("title");
  });

  test("falls back to the first text-like field when neither name nor title exists", () => {
    const objectRecordMetadata = createObjectMetadata([
      baseField({ id: "field-status", name: "status", type: "SELECT", label: "Status" }),
      baseField({ id: "field-full-name", name: "fullName", type: "FULL_NAME", label: "Full name" }),
      baseField({ id: "field-summary", name: "summary", type: "TEXT", label: "Summary" }),
    ]);

    expect(selectPrimaryField(objectRecordMetadata).name).toBe("fullName");
  });
});
