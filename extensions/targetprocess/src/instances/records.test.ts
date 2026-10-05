import { describe, expect, it } from "vitest";

import { TargetprocessError } from "../api/types";
import type { Instance } from "../api/types";
import {
  defaultLabel,
  parseInstances,
  removeInstance,
  resolveSelected,
  upsertInstance,
  validateDraft,
} from "./records";

function instance(overrides: Partial<Instance> = {}): Instance {
  return {
    id: "one",
    label: "Acme",
    baseUrl: "https://acme.tpondemand.com",
    token: "token",
    ...overrides,
  };
}

describe("parseInstances", () => {
  it("returns nothing for absent storage", () => {
    expect(parseInstances(undefined)).toEqual([]);
    expect(parseInstances(null)).toEqual([]);
    expect(parseInstances("")).toEqual([]);
  });

  it("survives corrupt JSON rather than throwing", () => {
    expect(parseInstances("{not json")).toEqual([]);
  });

  it("survives a value that is not a list", () => {
    expect(parseInstances(JSON.stringify({ id: "one" }))).toEqual([]);
  });

  it("round-trips what we wrote", () => {
    const stored = [instance(), instance({ id: "two", label: "Sandbox" })];
    expect(parseInstances(JSON.stringify(stored))).toEqual(stored);
  });

  it("drops entries missing the fields a request needs, keeping the rest", () => {
    const stored = [instance(), { id: "two", label: "No URL", token: "t" }, { label: "No id" }, null, "nonsense"];
    expect(parseInstances(JSON.stringify(stored))).toEqual([instance()]);
  });
});

describe("upsertInstance", () => {
  it("appends an instance that is not there yet", () => {
    const added = instance({ id: "two" });
    expect(upsertInstance([instance()], added)).toEqual([instance(), added]);
  });

  it("replaces in place, preserving the user's order", () => {
    const list = [instance(), instance({ id: "two" }), instance({ id: "three" })];
    const edited = instance({ id: "two", label: "Renamed" });
    expect(upsertInstance(list, edited).map((entry) => entry.id)).toEqual(["one", "two", "three"]);
    expect(upsertInstance(list, edited)[1]?.label).toBe("Renamed");
  });

  it("does not mutate the list it was given", () => {
    const list = [instance()];
    upsertInstance(list, instance({ id: "two" }));
    expect(list).toHaveLength(1);
  });
});

describe("removeInstance", () => {
  it("removes by id and leaves the others alone", () => {
    const list = [instance(), instance({ id: "two" })];
    expect(removeInstance(list, "one")).toEqual([instance({ id: "two" })]);
  });

  it("is a no-op for an unknown id", () => {
    expect(removeInstance([instance()], "missing")).toEqual([instance()]);
  });
});

describe("resolveSelected", () => {
  it("returns the selected instance", () => {
    const list = [instance(), instance({ id: "two" })];
    expect(resolveSelected(list, "two")?.id).toBe("two");
  });

  it("falls back to the first when the selection was deleted", () => {
    const list = [instance({ id: "two" }), instance({ id: "three" })];
    expect(resolveSelected(list, "one")?.id).toBe("two");
  });

  it("falls back to the first when nothing is selected", () => {
    expect(resolveSelected([instance()], null)?.id).toBe("one");
  });

  it("returns nothing when there are no instances", () => {
    expect(resolveSelected([], "one")).toBeUndefined();
  });
});

describe("defaultLabel", () => {
  it("uses the account name of a hosted instance", () => {
    expect(defaultLabel("https://acme.tpondemand.com")).toBe("Acme");
  });

  it("uses the first host segment on premise", () => {
    expect(defaultLabel("https://tools.corp.local/TargetProcess")).toBe("Tools");
  });
});

describe("validateDraft", () => {
  it("normalises the URL and keeps the given label", () => {
    expect(validateDraft({ label: "  Acme Prod ", url: " acme.tpondemand.com/ ", token: " secret " })).toEqual({
      label: "Acme Prod",
      baseUrl: "https://acme.tpondemand.com",
      token: "secret",
    });
  });

  it("invents a label when none is given", () => {
    expect(validateDraft({ label: "   ", url: "https://acme.tpondemand.com", token: "secret" }).label).toBe("Acme");
  });

  it("refuses an empty token", () => {
    expect(() => validateDraft({ label: "Acme", url: "https://acme.tpondemand.com", token: "  " })).toThrow(
      TargetprocessError,
    );
    expect(() => validateDraft({ label: "Acme", url: "https://acme.tpondemand.com", token: "" })).toThrow(
      /personal access token/,
    );
  });

  it("refuses a URL that is not one, before any request is made", () => {
    expect(() => validateDraft({ label: "Acme", url: "   ", token: "secret" })).toThrow(/Enter the URL/);
  });
});
