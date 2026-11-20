import os from "node:os";
import { describe, expect, it } from "vitest";
import { getActionDefinition } from "../src/actions";
import { parseReferenceYaml } from "../src/parser";

describe("namespaced actions", () => {
  it("opens a value with a named application", () => {
    const definition = getActionDefinition("application/Ghostty");
    const action = definition?.render("/Projects/sushigami");
    expect(definition?.title).toBe("Open in Ghostty");
    expect(action?.props).toMatchObject({
      title: "Open in Ghostty",
      target: "/Projects/sushigami",
      application: "Ghostty",
    });
  });

  it("expands a home-directory target before opening an application", () => {
    const action = getActionDefinition("application/Terminal")?.render("~/.");
    expect(action?.props.target).toBe(os.homedir());
  });

  it("launches a named Raycast Script Command with the value as argument 1", () => {
    const definition = getActionDefinition("raycast/script/open-project-terminal");
    const action = definition?.render("/Projects/My Project");
    expect(action?.props.target).toBe(
      "raycast://script-commands/open-project-terminal?arguments=%2FProjects%2FMy%20Project",
    );
  });

  it("extracts namespaced actions from YAML without registration", () => {
    const result = parseReferenceYaml(
      `
projects:
  home:
    location:
      value: ~
      open: \${value}
      application/Terminal: \${value}
  sushigami:
    location:
      value: /Projects/sushigami
      application/Ghostty: \${value}
      raycast/script/open-project-terminal: \${value}
`,
      "projects.yaml",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.records[0].fields[0].effectiveValue).toBe("~");
    expect(result.records[1].fields[0].actions.map((action) => action.kind)).toEqual([
      "application/Ghostty",
      "raycast/script/open-project-terminal",
    ]);
  });

  it("reports malformed actions inside reserved namespaces", () => {
    const result = parseReferenceYaml(
      `
projects:
  broken:
    location:
      value: /Projects/broken
      raycast/unknown/action: \${value}
`,
      "projects.yaml",
    );
    expect(result.records).toEqual([]);
    expect(result.diagnostics[0].message).toContain("unknown or incomplete action");
  });
});
