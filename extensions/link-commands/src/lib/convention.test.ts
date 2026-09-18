import { describe, expect, it } from "vitest";
import { facetsOf, splitPackage } from "./convention";
import { buildScript, scriptFilename } from "./generate-script";

describe("facetsOf", () => {
  it("reads the environment from the subtitle", () => {
    expect(facetsOf({ title: "Sprint Board", packageName: "Linear · @work · #dev" })).toEqual({
      environment: "work",
      name: "Sprint Board",
      brand: "Linear",
      category: "dev",
    });
  });

  it("still reads the environment from a title that leads with it", () => {
    expect(facetsOf({ title: "@work · Sprint Board", packageName: "Linear" })).toEqual({
      environment: "work",
      name: "Sprint Board",
      brand: "Linear",
    });
  });

  it("lets the title win when a command carries both", () => {
    expect(facetsOf({ title: "@work · Sprint Board", packageName: "Linear · @home" })).toEqual({
      environment: "work",
      name: "Sprint Board",
      brand: "Linear",
    });
  });

  it("honours the loose category form without a separator", () => {
    expect(facetsOf({ title: "Watch Later", packageName: "YouTube #media" })).toEqual({
      name: "Watch Later",
      brand: "YouTube",
      category: "media",
    });
  });

  it("keeps a separated multi-word brand whole", () => {
    expect(facetsOf({ title: "Front Page", packageName: "The Guardian · #news" })).toEqual({
      name: "Front Page",
      brand: "The Guardian",
      category: "news",
    });
  });

  it("does not take a mid-string @ for a scope", () => {
    expect(facetsOf({ title: "Chat @ Mozilla", packageName: "Matrix" })).toEqual({
      name: "Chat @ Mozilla",
      brand: "Matrix",
    });
  });

  it("reads a bare handle as an environment, as documented", () => {
    expect(facetsOf({ title: "Profile", packageName: "@kud" })).toEqual({ environment: "kud", name: "Profile" });
  });

  it("degrades to a bare name when the subtitle is empty", () => {
    expect(facetsOf({ title: "Netflix", packageName: "" })).toEqual({ name: "Netflix" });
    expect(facetsOf({ title: "Netflix", packageName: undefined })).toEqual({ name: "Netflix" });
  });
});

describe("splitPackage", () => {
  it("lifts each sigil out of the brand and keeps the first of each kind", () => {
    expect(splitPackage("Linear · @work · #dev · @home · #ops")).toEqual({
      brand: "Linear",
      environment: "work",
      category: "dev",
      extras: ["@home", "#ops"],
    });
  });

  it("returns no brand when only sigils remain", () => {
    expect(splitPackage("@work · #dev")).toEqual({ environment: "work", category: "dev", extras: [] });
  });
});

describe("buildScript", () => {
  const draft = {
    title: "Sprint Board",
    target: "https://linear.app/acme/team/ENG/active",
    environment: "work",
    packageName: "Linear",
    category: "dev",
    author: "Jane Doe",
    authorURL: "https://github.com/janedoe",
  };

  it("writes the environment on the subtitle and leaves the title bare", () => {
    const { contents } = buildScript(draft);

    expect(contents).toContain("# @raycast.title Sprint Board\n");
    expect(contents).toContain("# @raycast.packageName Linear · @work · #dev\n");
    expect(contents).not.toContain("@raycast.title @work");
  });

  it("derives the filename from scope, brand and detail", () => {
    expect(buildScript(draft).filename).toBe("work.linear.sprint-board.sh");
    expect(scriptFilename(draft)).toBe("work.linear.sprint-board.sh");
  });

  it("round-trips: what the writer emits, the reader recovers", () => {
    const { contents } = buildScript(draft);
    const title = contents.match(/^# @raycast\.title (.+)$/m)?.[1] ?? "";
    const packageName = contents.match(/^# @raycast\.packageName (.+)$/m)?.[1];

    expect(facetsOf({ title, packageName })).toEqual({
      environment: "work",
      name: "Sprint Board",
      brand: "Linear",
      category: "dev",
    });
  });

  it("tolerates a sigil typed into the environment or category", () => {
    const { contents } = buildScript({ ...draft, environment: "@work", category: "#dev" });

    expect(contents).toContain("# @raycast.packageName Linear · @work · #dev\n");
  });

  it("omits the environment from the subtitle for a personal command", () => {
    const { contents, filename } = buildScript({ ...draft, environment: undefined });

    expect(contents).toContain("# @raycast.packageName Linear · #dev\n");
    expect(filename).toBe("linear.sprint-board.sh");
  });
});
