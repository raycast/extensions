import { describe, expect, it } from "vitest";
import { buildSuggestCommandArgs, pillsToSetupTasks, type SuggestionPill } from "../lib/suggest-commands";

describe("suggest-commands", () => {
  it("builds suggest CLI args with used commands", () => {
    expect(buildSuggestCommandArgs("C:\\Projects\\app", ["npm run dev", "  ", "dotnet watch"], 42)).toEqual([
      "suggest",
      "--dir",
      "C:\\Projects\\app",
      "--generation",
      "42",
      "--used",
      "npm run dev",
      "--used",
      "dotnet watch",
    ]);
  });

  it("maps pills to setup tasks and drops blank or duplicate commands", () => {
    const pills: SuggestionPill[] = [
      {
        command: "npm run dev",
        taskType: "frontend",
        typeTitle: "Frontend",
        displayTitle: "Dev server",
        tooltip: "npm run dev",
      },
      {
        command: "npm run dev",
        taskType: "frontend",
        typeTitle: "Frontend",
        displayTitle: "Duplicate",
        tooltip: "dup",
      },
      {
        command: "  ",
        taskType: "none",
        typeTitle: "Empty",
        displayTitle: "Empty",
        tooltip: "",
      },
      {
        command: "dotnet watch",
        taskType: "api",
        typeTitle: "API",
        displayTitle: "",
        tooltip: "dotnet watch",
      },
    ];

    expect(pillsToSetupTasks(pills)).toEqual([
      { label: "Dev server", command: "npm run dev" },
      { label: "API", command: "dotnet watch" },
    ]);
  });
});
