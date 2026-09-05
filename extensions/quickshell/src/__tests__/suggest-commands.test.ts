import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildSuggestCommandArgs,
  combineSuggestionTasksAndPills,
  LOCAL_SETUP_SEED_TASKS,
  parseSuggestionResponse,
  pillsToSetupTasks,
  resolveSuggestExecutable,
  splitPillsIntoSeedAndLeftover,
  type SuggestionPill,
} from "../lib/suggest-commands";

function pill(partial: Partial<SuggestionPill> & Pick<SuggestionPill, "command" | "taskType">): SuggestionPill {
  return {
    typeTitle: partial.typeTitle ?? partial.taskType,
    displayTitle: partial.displayTitle ?? partial.command,
    tooltip: partial.tooltip ?? partial.command,
    ...partial,
  };
}

describe("suggest-commands", () => {
  it("resolves the packaged CLI from Raycast assets", () => {
    expect(resolveSuggestExecutable("C:\\Raycast\\assets")).toBe(
      path.join("C:\\Raycast\\assets", "QuickShell.Suggest.exe"),
    );
  });

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
      { label: "Dev server", command: "npm run dev", taskType: "frontend" },
      { label: "API", command: "dotnet watch", taskType: "api" },
    ]);
  });

  it("keeps seeded and leftover suggestions selectable for manual create", () => {
    const combined = combineSuggestionTasksAndPills(
      [{ label: "Dev", command: "npm run dev", taskType: "frontend" }],
      [
        pill({ command: "npm run dev", taskType: "frontend" }),
        pill({ command: "npm test", taskType: "test", displayTitle: "Test" }),
      ],
    );

    expect(combined.map((entry) => entry.command)).toEqual(["npm run dev", "npm test"]);
    expect(combined[0].displayTitle).toBe("Dev");
  });

  it("splits preferred setup pills into a short seed and leftover Actions pills", () => {
    const pills = [
      pill({ command: "npm run build", taskType: "build", displayTitle: "Build" }),
      pill({ command: "npm run dev", taskType: "frontend", displayTitle: "Dev" }),
      pill({ command: "dotnet watch", taskType: "api", displayTitle: "API" }),
      pill({ command: "npm test", taskType: "test", displayTitle: "Test" }),
      pill({ command: "claude", taskType: "agent", displayTitle: "Agent" }),
      pill({ command: "npm run lint", taskType: "none", displayTitle: "Lint" }),
    ];

    const split = splitPillsIntoSeedAndLeftover(pills, 4);
    expect(split.tasks.map((task) => task.command)).toEqual([
      "npm run build",
      "npm run dev",
      "dotnet watch",
      "npm test",
    ]);
    expect(split.tasks[1].taskType).toBe("frontend");
    expect(split.leftoverPills.map((entry) => entry.command)).toEqual(["claude", "npm run lint"]);
  });

  it("keeps local-heuristic leftovers selectable with the smaller local seed cap", () => {
    const pills = [
      pill({ command: "dotnet build", taskType: "none", displayTitle: "Build" }),
      pill({ command: "dotnet test", taskType: "none", displayTitle: "Tests" }),
      pill({ command: "dotnet watch", taskType: "none", displayTitle: "Watch" }),
      pill({ command: "dotnet run", taskType: "none", displayTitle: "Run" }),
    ];

    const split = splitPillsIntoSeedAndLeftover(pills, LOCAL_SETUP_SEED_TASKS);
    expect(split.tasks.map((task) => task.command)).toEqual(["dotnet build", "dotnet test"]);
    expect(split.leftoverPills.map((entry) => entry.command)).toEqual(["dotnet watch", "dotnet run"]);
  });

  it("falls back to the first pills when none are preferred setup types", () => {
    const pills = [
      pill({ command: "echo one", taskType: "none", displayTitle: "One" }),
      pill({ command: "echo two", taskType: "none", displayTitle: "Two" }),
      pill({ command: "echo three", taskType: "none", displayTitle: "Three" }),
    ];

    const split = splitPillsIntoSeedAndLeftover(pills, 4);
    expect(split.tasks.map((task) => task.command)).toEqual(["echo one", "echo two"]);
    expect(split.leftoverPills.map((entry) => entry.command)).toEqual(["echo three"]);
  });

  it("parses Suggest payloads and drops malformed pills", () => {
    expect(
      parseSuggestionResponse({
        generation: 7,
        pills: [
          {
            command: "npm run dev",
            taskType: "frontend",
            typeTitle: "Frontend",
            displayTitle: "Dev",
            tooltip: "npm run dev",
          },
          { command: 42, taskType: "frontend" },
          null,
          "bad",
        ],
      }),
    ).toEqual({
      generation: 7,
      pills: [
        {
          command: "npm run dev",
          taskType: "frontend",
          typeTitle: "Frontend",
          displayTitle: "Dev",
          tooltip: "npm run dev",
        },
      ],
    });
  });

  it("rejects Suggest payloads when every pill is malformed", () => {
    expect(
      parseSuggestionResponse({
        generation: 1,
        pills: [{ command: 1 }, { taskType: "frontend" }],
      }),
    ).toBeNull();
    expect(parseSuggestionResponse({ generation: "1", pills: [] })).toBeNull();
    expect(parseSuggestionResponse({ generation: 1 })).toBeNull();
  });
});
