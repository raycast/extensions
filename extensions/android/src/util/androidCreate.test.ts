import { describe, test } from "node:test";
import { expect } from "./expect";
import {
  buildCreateCommand,
  parseTemplateList,
  projectDestination,
} from "./androidCreate";

// Captured verbatim from `android create --list`. The table is fixed-width:
// each column starts at the offset of its header label, and the default
// template is flagged with a "(default)" suffix on its name.
const REAL_LIST_OUTPUT = `Template name                           Template description    Tags
empty-activity (default)                Empty Activity          compose,activity,agp-9
`;

describe("parseTemplateList", () => {
  test("Given real create --list stdout, When parsed, Then the header is skipped and the row is split into name, description and tags", () => {
    const templates = parseTemplateList(REAL_LIST_OUTPUT);

    expect(templates).toHaveLength(1);
    expect(templates[0]).toEqual({
      name: "empty-activity",
      description: "Empty Activity",
      tags: ["compose", "activity", "agp-9"],
      isDefault: true,
    });
  });

  test("Given a multi-word description column, When parsed, Then the spaces inside the description are preserved", () => {
    // A hypothetical future row proves we slice by header column offsets rather
    // than splitting on whitespace (which would shatter the description).
    const output = `Template name                           Template description    Tags
compose-wizard                          Compose Setup Wizard    compose,wizard
`;

    const templates = parseTemplateList(output);

    expect(templates).toEqual([
      {
        name: "compose-wizard",
        description: "Compose Setup Wizard",
        tags: ["compose", "wizard"],
        isDefault: false,
      },
    ]);
  });

  test("Given output with only a header and no rows, When parsed, Then returns an empty list", () => {
    expect(
      parseTemplateList("Template name    Template description    Tags\n")
    ).toEqual([]);
  });

  test("Given empty stdout, When parsed, Then returns an empty list", () => {
    expect(parseTemplateList("")).toEqual([]);
  });
});

describe("buildCreateCommand", () => {
  test("Given a template, name, minSdk and output dir, When built, Then it matches the documented `android create` invocation", () => {
    const command = buildCreateCommand("/usr/local/bin/android", {
      template: "empty-activity",
      name: "My App",
      minSdk: "24",
      outputDir: "/Users/me/AndroidStudioProjects",
    });

    expect(command).toBe(
      "'/usr/local/bin/android' create 'empty-activity' --name='My App' --minSdk='24' -o='/Users/me/AndroidStudioProjects'"
    );
  });

  test("Given no minSdk, When built, Then the --minSdk flag is omitted so the template default applies", () => {
    const command = buildCreateCommand("/usr/local/bin/android", {
      template: "empty-activity",
      name: "Demo",
      outputDir: "/tmp/p",
    });

    expect(command).toBe(
      "'/usr/local/bin/android' create 'empty-activity' --name='Demo' -o='/tmp/p'"
    );
  });

  test("Given a name containing a single quote, When built, Then it is POSIX-escaped so the shell can't break out", () => {
    const command = buildCreateCommand("/bin/android", {
      template: "empty-activity",
      name: "Bob's App",
      outputDir: "/tmp/p",
    });

    expect(command).toContain("--name='Bob'\\''s App'");
  });
});

describe("projectDestination", () => {
  test("Given a parent dir and an app name, When joined, Then the project lands in a verbatim-named subfolder", () => {
    expect(
      projectDestination("/Users/me/AndroidStudioProjects", "My Demo App")
    ).toBe("/Users/me/AndroidStudioProjects/My Demo App");
  });

  test("Given a parent dir with a trailing slash, When joined, Then no double slash appears", () => {
    expect(projectDestination("/Users/me/Projects/", "Demo")).toBe(
      "/Users/me/Projects/Demo"
    );
  });

  test("Given an app name with surrounding whitespace, When joined, Then the name is trimmed", () => {
    expect(projectDestination("/Users/me/Projects", "  Demo  ")).toBe(
      "/Users/me/Projects/Demo"
    );
  });
});
