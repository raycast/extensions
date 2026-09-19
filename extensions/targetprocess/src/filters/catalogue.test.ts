import { describe, expect, it } from "vitest";

import { EntityTypeInfo, mapEntityTypes } from "../api/entityTypes";
import {
  assignableNames,
  defaultSelection,
  humaniseTypeName,
  normaliseSelection,
  PAGE_SIZE,
  planSearch,
  summariseSelection,
  WIDE_PAGE_SIZE,
} from "./catalogue";

function type(name: string, assignable: boolean, hierarchyLevel = 0): EntityTypeInfo {
  return { name, assignable, hierarchyLevel };
}

/** Roughly what a real instance returns, ordered as mapEntityTypes would. */
const CATALOGUE: EntityTypeInfo[] = [
  type("Epic", true, 3),
  type("Feature", true, 2),
  type("UserStory", true, 1),
  type("Bug", true, 1),
  type("Task", true, 0),
  type("Release", false, 0),
  type("Project", false, 0),
  type("TestCase", false, 0),
];

const WORK_ITEMS = ["Epic", "Feature", "UserStory", "Bug", "Task"];

describe("mapEntityTypes", () => {
  it("keeps only searchable types", () => {
    const mapped = mapEntityTypes({
      Items: [
        { Name: "Bug", IsSearchable: true, IsAssignable: true, HierarchyLevel: 1 },
        { Name: "Comment", IsSearchable: false, IsAssignable: false },
        { Name: "Attachment", IsAssignable: false },
      ],
    });
    expect(mapped.map((entry) => entry.name)).toEqual(["Bug"]);
  });

  it("drops entries without a name", () => {
    expect(mapEntityTypes({ Items: [{ IsSearchable: true }] })).toEqual([]);
  });

  it("puts work items first, then higher hierarchy levels, then name order", () => {
    const mapped = mapEntityTypes({
      Items: [
        { Name: "Release", IsSearchable: true, IsAssignable: false },
        { Name: "Task", IsSearchable: true, IsAssignable: true, HierarchyLevel: 0 },
        { Name: "Epic", IsSearchable: true, IsAssignable: true, HierarchyLevel: 3 },
        { Name: "Bug", IsSearchable: true, IsAssignable: true, HierarchyLevel: 1 },
      ],
    });
    expect(mapped.map((entry) => entry.name)).toEqual(["Epic", "Bug", "Task", "Release"]);
  });

  it("defaults a missing hierarchy level rather than producing NaN", () => {
    const [only] = mapEntityTypes({ Items: [{ Name: "Bug", IsSearchable: true, IsAssignable: true }] });
    expect(only?.hierarchyLevel).toBe(0);
  });

  it("handles an empty or absent collection", () => {
    expect(mapEntityTypes({})).toEqual([]);
  });
});

describe("humaniseTypeName", () => {
  it("splits camel case and pluralises", () => {
    expect(humaniseTypeName("UserStory")).toBe("User Stories");
    expect(humaniseTypeName("PortfolioEpic")).toBe("Portfolio Epics");
    expect(humaniseTypeName("TestCase")).toBe("Test Cases");
    expect(humaniseTypeName("Bug")).toBe("Bugs");
  });

  it("pluralises sibilant endings with -es", () => {
    expect(humaniseTypeName("Process")).toBe("Processes");
    expect(humaniseTypeName("Batch")).toBe("Batches");
  });

  it("keeps a vowel before y", () => {
    expect(humaniseTypeName("Journey")).toBe("Journeys");
  });
});

describe("defaultSelection", () => {
  it("is the assignable types", () => {
    expect(defaultSelection(CATALOGUE)).toEqual(WORK_ITEMS);
  });

  it("falls back to everything when an instance has no assignable types", () => {
    const odd = [type("Release", false), type("Project", false)];
    expect(defaultSelection(odd)).toEqual(["Release", "Project"]);
  });
});

describe("normaliseSelection", () => {
  it("drops types this instance does not have", () => {
    expect(normaliseSelection(["Bug", "Impediment"], CATALOGUE)).toEqual(["Bug"]);
  });

  it("returns catalogue order regardless of input order", () => {
    expect(normaliseSelection(["Task", "Epic"], CATALOGUE)).toEqual(["Epic", "Task"]);
  });
});

describe("planSearch", () => {
  it("uses Assignables with no client-side filtering for the default selection", () => {
    const plan = planSearch(defaultSelection(CATALOGUE), false, CATALOGUE);
    expect(plan.collection).toBe("Assignables");
    expect(plan.filterTypes).toBeNull();
    expect(plan.take).toBe(PAGE_SIZE);
    expect(plan.excludeFinalInQuery).toBe(true);
  });

  it("stays on Assignables but filters when the selection is narrower", () => {
    const plan = planSearch(["Bug"], false, CATALOGUE);
    expect(plan.collection).toBe("Assignables");
    expect(plan.filterTypes).toEqual(["Bug"]);
    expect(plan.take).toBe(WIDE_PAGE_SIZE);
  });

  it("switches to General as soon as a non-assignable type is included", () => {
    const plan = planSearch(["Bug", "Release"], false, CATALOGUE);
    expect(plan.collection).toBe("Generals");
    expect(plan.filterTypes).toEqual(["Bug", "Release"]);
  });

  it("filters final states client-side on General, because the query cannot", () => {
    const plan = planSearch(["Release"], false, CATALOGUE);
    expect(plan.excludeFinalInQuery).toBe(false);
    expect(plan.filterFinalClientSide).toBe(true);
  });

  it("does not filter final states at all when they are wanted", () => {
    expect(planSearch(["Release"], true, CATALOGUE).filterFinalClientSide).toBe(false);
    expect(planSearch(defaultSelection(CATALOGUE), true, CATALOGUE).excludeFinalInQuery).toBe(false);
  });

  it("ignores types the instance does not have when choosing a collection", () => {
    const plan = planSearch([...WORK_ITEMS, "Impediment"], false, CATALOGUE);
    expect(plan.collection).toBe("Assignables");
    expect(plan.filterTypes).toBeNull();
  });

  it("does not claim to cover Assignables when the catalogue is empty", () => {
    expect(planSearch([], false, []).filterTypes).toEqual([]);
  });
});

describe("summariseSelection", () => {
  it("says nothing for the default selection", () => {
    expect(summariseSelection(defaultSelection(CATALOGUE), CATALOGUE)).toBeUndefined();
  });

  it("names one or two types", () => {
    expect(summariseSelection(["Bug"], CATALOGUE)).toBe("bugs");
    expect(summariseSelection(["Bug", "Release"], CATALOGUE)).toBe("bugs, releases");
  });

  it("counts a larger partial selection against this instance's total", () => {
    expect(summariseSelection(["Bug", "Release", "Project"], CATALOGUE)).toBe("3 of 8 types");
  });

  it("calls out the extremes", () => {
    expect(summariseSelection([], CATALOGUE)).toBe("no types");
    expect(
      summariseSelection(
        CATALOGUE.map((entry) => entry.name),
        CATALOGUE,
      ),
    ).toBe("all types");
  });

  it("says nothing before the catalogue has loaded", () => {
    expect(summariseSelection(["Bug"], [])).toBeUndefined();
  });
});

describe("assignableNames", () => {
  it("returns only the work item types", () => {
    expect(assignableNames(CATALOGUE)).toEqual(WORK_ITEMS);
  });
});
