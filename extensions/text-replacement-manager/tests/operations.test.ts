import { describe, expect, it } from "vitest";

import { cloneReplacement, createReplacement, deleteReplacement, updateReplacement } from "../src/lib/operations";
import type { TextReplacement } from "../src/lib/types";

const existing: TextReplacement[] = [
  { uuid: "uuid-omw", trigger: "omw", replacementText: "On my way!", tags: ["chat"], enabled: true },
];

describe("replacement operations", () => {
  it("creates and updates replacements with normalized values", () => {
    const created = createReplacement(existing, { trigger: " brb ", replacementText: "Be right back", tags: "chat, quick replies" });
    expect(created).toEqual([
      existing[0],
      { uuid: expect.any(String), trigger: "brb", replacementText: "Be right back", tags: ["chat", "quick replies"], enabled: true },
    ]);

    expect(updateReplacement(created, "uuid-omw", { trigger: "omw2", replacementText: "On my way soon", tags: [] })).toEqual([
      { uuid: "uuid-omw", trigger: "omw2", replacementText: "On my way soon", tags: [], enabled: true },
      created[1],
    ]);
  });

  it("preserves intentional leading and trailing replacement text whitespace", () => {
    const created = createReplacement(existing, { trigger: "sig", replacementText: "  Max  ", tags: [] });

    expect(created[1].replacementText).toBe("  Max  ");
    expect(updateReplacement(created, "uuid-omw", { trigger: "omw", replacementText: "\nOn my way!\n", tags: [] })[0].replacementText).toBe(
      "\nOn my way!\n",
    );
  });

  it("clones with a new trigger and deletes by uuid", () => {
    const cloned = cloneReplacement(existing, "uuid-omw", {
      trigger: "omw2",
      replacementText: "On my way!",
      tags: ["chat"],
    });

    expect(cloned).toHaveLength(2);
    expect(cloned[1]).toMatchObject({ trigger: "omw2", replacementText: "On my way!", tags: ["chat"], enabled: true });
    expect(cloned[1].uuid).not.toBe("uuid-omw");

    expect(deleteReplacement(cloned, "uuid-omw")).toEqual([cloned[1]]);
  });
});
