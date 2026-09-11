import { describe, expect, it } from "vitest";
import { parseLine, serializeTask } from "./parser";
import {
  bumpPriorityDown,
  bumpPriorityUp,
  complete,
  setDue,
  setPriority,
  taskFromFields,
  uncomplete,
  withCreationDate,
} from "./task";

describe("complete", () => {
  it("marks a task complete with the given date and drops priority (todo.txt spec)", () => {
    const t = parseLine("(A) Call dentist", 0);
    const done = complete(t, "2026-05-14");
    expect(done.completed).toBe(true);
    expect(done.completionDate).toBe("2026-05-14");
    expect(done.priority).toBeUndefined();
    expect(serializeTask(done)).toBe("x 2026-05-14 Call dentist");
  });

  it("is a no-op when task is already complete", () => {
    const t = parseLine("x 2026-05-13 Buy milk", 0);
    const done = complete(t, "2026-05-14");
    expect(done.completionDate).toBe("2026-05-13");
    expect(done.completed).toBe(true);
  });
});

describe("uncomplete", () => {
  it("removes completed flag and completion date", () => {
    const t = parseLine("x 2026-05-14 (A) Call dentist", 0);
    const back = uncomplete(t);
    expect(back.completed).toBe(false);
    expect(back.completionDate).toBeUndefined();
    expect(back.priority).toBe("A");
    expect(serializeTask(back)).toBe("(A) Call dentist");
  });

  it("is a no-op when task is already incomplete", () => {
    const t = parseLine("(A) Call dentist", 0);
    const back = uncomplete(t);
    expect(back.completed).toBe(false);
  });
});

describe("setPriority", () => {
  it("adds priority when none present", () => {
    const t = parseLine("Buy milk", 0);
    const out = setPriority(t, "B");
    expect(out.priority).toBe("B");
    expect(serializeTask(out)).toBe("(B) Buy milk");
  });

  it("replaces existing priority", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(setPriority(t, "C").priority).toBe("C");
  });

  it("clears priority when given undefined", () => {
    const t = parseLine("(A) Call dentist", 0);
    expect(setPriority(t, undefined).priority).toBeUndefined();
    expect(serializeTask(setPriority(t, undefined))).toBe("Call dentist");
  });
});

describe("bumpPriorityUp", () => {
  it("moves toward (A) — B becomes A", () => {
    const t = parseLine("(B) Buy milk", 0);
    expect(bumpPriorityUp(t).priority).toBe("A");
  });

  it("stays at A when already top", () => {
    const t = parseLine("(A) Top thing", 0);
    expect(bumpPriorityUp(t).priority).toBe("A");
  });

  it("assigns (Z) when starting with no priority", () => {
    const t = parseLine("Buy milk", 0);
    expect(bumpPriorityUp(t).priority).toBe("Z");
  });
});

describe("bumpPriorityDown", () => {
  it("moves toward (Z) — A becomes B", () => {
    const t = parseLine("(A) Buy milk", 0);
    expect(bumpPriorityDown(t).priority).toBe("B");
  });

  it("clears priority when bumping below Z", () => {
    const t = parseLine("(Z) Tail task", 0);
    expect(bumpPriorityDown(t).priority).toBeUndefined();
  });

  it("is a no-op when already unprioritized", () => {
    const t = parseLine("Buy milk", 0);
    expect(bumpPriorityDown(t).priority).toBeUndefined();
  });
});

describe("withCreationDate", () => {
  it("adds creation date when none present", () => {
    const t = parseLine("Buy milk", 0);
    const out = withCreationDate(t, "2026-05-14");
    expect(out.creationDate).toBe("2026-05-14");
    expect(serializeTask(out)).toBe("2026-05-14 Buy milk");
  });

  it("does not overwrite existing creation date", () => {
    const t = parseLine("2026-05-10 Buy milk", 0);
    const out = withCreationDate(t, "2026-05-14");
    expect(out.creationDate).toBe("2026-05-10");
  });
});

describe("taskFromFields", () => {
  it("constructs a Task from structured fields with all values set", () => {
    const t = taskFromFields({
      description: "Call dentist",
      priority: "A",
      projects: ["health"],
      contexts: ["phone"],
      due: "2026-05-20",
      creationDate: "2026-05-14",
    });
    expect(t.priority).toBe("A");
    expect(t.description).toBe("Call dentist +health @phone due:2026-05-20");
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.metadata).toEqual({ due: "2026-05-20" });
    expect(t.creationDate).toBe("2026-05-14");
    expect(t.completed).toBe(false);
    expect(t.raw).toBe("(A) 2026-05-14 Call dentist +health @phone due:2026-05-20");
  });

  it("handles minimal fields (description only)", () => {
    const t = taskFromFields({
      description: "Buy milk",
      projects: [],
      contexts: [],
    });
    expect(t.raw).toBe("Buy milk");
    expect(t.description).toBe("Buy milk");
    expect(t.priority).toBeUndefined();
  });

  it("merges tags typed into description with structured tags (defensive)", () => {
    const t = taskFromFields({
      description: "Call +health dentist @phone",
      projects: ["health"],
      contexts: [],
    });
    expect(t.projects).toEqual(["health"]);
    expect(t.contexts).toEqual(["phone"]);
    expect(t.description).toBe("Call dentist +health @phone");
    expect(t.raw).toBe("Call dentist +health @phone");
  });

  it("deduplicates tags when description contains the same tag as the structured list", () => {
    const t = taskFromFields({
      description: "Email +work alice",
      projects: ["work"],
      contexts: [],
    });
    expect(t.projects).toEqual(["work"]);
    expect(t.description).toBe("Email alice +work");
  });

  it("merges metadata typed in description (due:) with the structured due field, structured wins", () => {
    const t = taskFromFields({
      description: "Plan due:2026-05-01 trip",
      projects: [],
      contexts: [],
      due: "2026-06-01",
    });
    expect(t.metadata).toEqual({ due: "2026-06-01" });
  });

  it("falls back to description-extracted due when no structured due is provided", () => {
    const t = taskFromFields({
      description: "Plan due:2026-05-01 trip",
      projects: [],
      contexts: [],
    });
    expect(t.metadata).toEqual({ due: "2026-05-01" });
  });

  it("sets completion fields when completed is true", () => {
    const t = taskFromFields({
      description: "Done already",
      projects: [],
      contexts: [],
      completed: true,
      completionDate: "2026-05-14",
    });
    expect(t.completed).toBe(true);
    expect(t.completionDate).toBe("2026-05-14");
    expect(t.raw).toBe("x 2026-05-14 Done already");
  });
});

describe("setDue", () => {
  it("sets due metadata and updates raw via serializeTask", () => {
    const original = parseLine("Draft launch email", 0);
    const updated = setDue(original, "2026-05-29");
    expect(updated.metadata.due).toBe("2026-05-29");
    expect(updated.raw).toContain("due:2026-05-29");
  });

  it("clears due metadata when passed undefined", () => {
    const withDue = parseLine("Draft launch email due:2026-05-29", 0);
    expect(withDue.metadata.due).toBe("2026-05-29");
    const cleared = setDue(withDue, undefined);
    expect(cleared.metadata.due).toBeUndefined();
    expect(cleared.raw).not.toContain("due:");
  });
});
