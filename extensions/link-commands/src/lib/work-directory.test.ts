import { describe, expect, it } from "vitest";
import {
  directoryEnvironmentAction,
  hoistShouldOverride,
  initialEnvironmentSource,
  isWorkPath,
  resolveAutoEnvironment,
} from "./work-directory";

describe("isWorkPath", () => {
  it("matches a work segment anywhere in the path", () => {
    expect(isWorkPath("~/dotfiles/profiles/work/scripts")).toBe(true);
    expect(isWorkPath("/Users/jane/work/scripts")).toBe(true);
  });

  it("leaves anything else personal", () => {
    expect(isWorkPath("~/scripts")).toBe(false);
    expect(isWorkPath("/Users/jane/scripts")).toBe(false);
    expect(isWorkPath("")).toBe(false);
  });

  it("matches whole segments only", () => {
    expect(isWorkPath("~/workscripts")).toBe(false);
    expect(isWorkPath("/Users/jane/homework/scripts")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isWorkPath("/Users/jane/Work/scripts")).toBe(false);
  });
});

describe("initialEnvironmentSource", () => {
  it("starts as auto for a work directory", () => {
    expect(initialEnvironmentSource("~/dotfiles/profiles/work/scripts")).toBe("auto");
  });

  it("starts empty otherwise", () => {
    expect(initialEnvironmentSource("~/scripts")).toBe(null);
    expect(initialEnvironmentSource("")).toBe(null);
  });
});

describe("hoistShouldOverride", () => {
  it("takes the control when it is empty", () => {
    expect(hoistShouldOverride("", null)).toBe(true);
    expect(hoistShouldOverride("", "auto")).toBe(true);
    expect(hoistShouldOverride("", "user")).toBe(true);
  });

  it("lets a typed scope replace an automatically chosen one", () => {
    expect(hoistShouldOverride("work", "auto")).toBe(true);
  });

  it("keeps a scope the person set by hand", () => {
    expect(hoistShouldOverride("work", "user")).toBe(false);
    expect(hoistShouldOverride("work", null)).toBe(false);
  });
});

describe("directoryEnvironmentAction", () => {
  it("ticks to Work when picking a work directory", () => {
    expect(directoryEnvironmentAction(null, true, "")).toBe("set-work");
  });

  it("leaves an already-ticked Work alone", () => {
    expect(directoryEnvironmentAction("auto", true, "work")).toBe("keep");
  });

  it("unticks Work back to None when picking any other directory", () => {
    expect(directoryEnvironmentAction("auto", false, "work")).toBe("clear-work");
  });

  it("leaves a non-Work scope alone when picking any other directory", () => {
    expect(directoryEnvironmentAction("auto", false, "personal")).toBe("keep");
    expect(directoryEnvironmentAction(null, false, "")).toBe("keep");
  });

  it("never moves a scope the person set", () => {
    expect(directoryEnvironmentAction("user", true, "personal")).toBe("keep");
    expect(directoryEnvironmentAction("user", false, "work")).toBe("keep");
    expect(directoryEnvironmentAction("user", false, "")).toBe("keep");
  });
});

describe("resolveAutoEnvironment", () => {
  const NEW_VALUE = "\u0000new";

  it("selects the existing entry once the facets arrive holding the auto scope", () => {
    expect(resolveAutoEnvironment("auto", NEW_VALUE, "work", [{ value: "work" }], NEW_VALUE)).toBe("work");
  });

  it("keeps the New field while the facets have nothing to match", () => {
    expect(resolveAutoEnvironment("auto", NEW_VALUE, "work", [], NEW_VALUE)).toBe(null);
    expect(resolveAutoEnvironment("auto", NEW_VALUE, "work", [{ value: "personal" }], NEW_VALUE)).toBe(null);
  });

  it("never resolves a user choice or an already-selected entry", () => {
    expect(resolveAutoEnvironment("user", NEW_VALUE, "work", [{ value: "work" }], NEW_VALUE)).toBe(null);
    expect(resolveAutoEnvironment("auto", "work", "work", [{ value: "work" }], NEW_VALUE)).toBe(null);
    expect(resolveAutoEnvironment(null, "", "", [{ value: "work" }], NEW_VALUE)).toBe(null);
  });

  it("keeps an auto value with no typed scope", () => {
    expect(resolveAutoEnvironment("auto", NEW_VALUE, "", [{ value: "work" }], NEW_VALUE)).toBe(null);
    expect(resolveAutoEnvironment("auto", NEW_VALUE, "  ", [{ value: "work" }], NEW_VALUE)).toBe(null);
  });
});
