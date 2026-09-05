import { describe, expect, it } from "vitest";

import {
  classifyMochiField,
  createAutomaticBindings,
  detectTemplateDrift,
  isDirectBindingCompatible,
} from "./mochi-template";
import type { MochiTemplateSnapshot, TemplateInputField } from "./template";

describe("Mochi template domain", () => {
  const fields: readonly TemplateInputField[] = [
    { id: "word", name: " Word ", type: "text", required: true, multiline: false },
    { id: "count", name: "Count", type: "number", required: false },
    { id: "enabled", name: "Enabled", type: "boolean" },
  ];

  it("classifies field types and enforces strict direct compatibility", () => {
    expect(classifyMochiField(target("text"))).toBe("mappable");
    expect(classifyMochiField(target("ai"))).toBe("mappable");
    expect(classifyMochiField(target("transcription"))).toBe("unsupported");
    expect(classifyMochiField(target("draw"))).toBe("unsupported");
    expect(classifyMochiField(target("future-type"))).toBe("unsupported");
    expect(isDirectBindingCompatible(fields[0], target("text"))).toBe(true);
    expect(isDirectBindingCompatible(fields[0], target("dictionary"))).toBe(true);
    expect(isDirectBindingCompatible(fields[0], target("number"))).toBe(false);
  });

  it("auto-maps exactly one compatible field after trim and lowercase", () => {
    const template = snapshot([
      { ...target("text"), id: "front", name: "word" },
      { ...target("number"), id: "amount", name: "COUNT" },
      { ...target("boolean"), id: "flag", name: "Enabled" },
      { ...target("text"), id: "other", name: "Count" },
    ]);

    expect(createAutomaticBindings(fields, template)).toEqual([
      { kind: "input", targetFieldId: "front", sourceFieldId: "word" },
      { kind: "input", targetFieldId: "amount", sourceFieldId: "count" },
      { kind: "input", targetFieldId: "flag", sourceFieldId: "enabled" },
    ]);
  });

  it("allows rename, order, and new fields but blocks removed or type-changed mapped fields", () => {
    const saved = snapshot([
      { ...target("text"), id: "front", name: "Front" },
      { ...target("number"), id: "count", name: "Count" },
    ]);
    const bindings = [
      { kind: "input" as const, targetFieldId: "front", sourceFieldId: "word" },
      { kind: "custom" as const, targetFieldId: "count", template: "1" },
    ];
    expect(
      detectTemplateDrift(
        saved,
        snapshot([
          { ...target("text"), id: "new", name: "New" },
          { ...target("number"), id: "count", name: "Renamed" },
          { ...target("text"), id: "front", name: "Renamed Front" },
        ]),
        bindings
      )
    ).toEqual([]);
    expect(
      detectTemplateDrift(saved, snapshot([{ ...target("boolean"), id: "front", name: "Front" }]), bindings).map(
        (issue) => issue.code
      )
    ).toEqual(["target-type-changed", "target-removed"]);
  });
});

function target(type: string): MochiTemplateSnapshot["fields"][number] {
  return { id: "field", name: "Field", type, multiline: false };
}

function snapshot(fields: MochiTemplateSnapshot["fields"]): MochiTemplateSnapshot {
  return { id: "template", name: "Template", fields };
}
