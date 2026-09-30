import { describe, expect, it } from "vitest";
import {
  parseProjectsOutput,
  parseTagsOutput,
  parseTasksOutput,
} from "./parsers";

const jsonTaskPayload = JSON.stringify({
  tasks: [
    {
      id: "task-1",
      title: "Test task",
      status: "in progress",
      scheduledDate: "2024-01-10T09:30:00Z",
      estimate: "45",
      projectName: "Project A",
      tags: ["work"],
      isCompleted: "false",
      isRecurring: "true",
      createdAt: "2024-01-01T08:00:00Z",
      modifiedAt: "2024-01-02T09:00:00Z",
    },
  ],
});

const legacyTaskPayload = [
  [
    "task-legacy",
    "Legacy task",
    "Notes line",
    "in progress",
    "2024-01-10T09:30:00Z",
    "missing value",
    "30",
    "Legacy Project",
    '{"tag1", "tag2"}',
    "true",
    "false",
    "2024-01-01T08:00:00Z",
    "2024-01-02T09:00:00Z",
  ].join("|||"),
].join("###");

const jsonProjectPayload = JSON.stringify({
  projects: [
    {
      id: "project-1",
      name: "Project 1",
      color: "#ff9500",
      note: "Project note",
      taskCount: "3",
      isArchived: "false",
    },
  ],
});

const legacyProjectPayload = [
  ["project-legacy", "Legacy Project", "#34c759", "Note", "2", "false"].join(
    "|||",
  ),
].join("###");

const jsonTagPayload = JSON.stringify({
  tags: [{ name: "home", taskCount: "4" }],
});

const legacyTagPayload = ["home|||4"].join("###");

describe("parsers", () => {
  it("parses JSON task payloads", () => {
    const tasks = parseTasksOutput(jsonTaskPayload);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Test task");
    expect(tasks[0].scheduledDateHasTime).toBe(true);
  });

  it("parses legacy task payloads", () => {
    const tasks = parseTasksOutput(legacyTaskPayload);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Legacy task");
    expect(tasks[0].tags).toEqual(["tag1", "tag2"]);
  });

  it("throws on unknown task payloads", () => {
    expect(() => parseTasksOutput("not-json")).toThrowError(
      /Unrecognized task payload/,
    );
  });

  it("parses JSON project payloads", () => {
    const projects = parseProjectsOutput(jsonProjectPayload);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Project 1");
  });

  it("parses legacy project payloads", () => {
    const projects = parseProjectsOutput(legacyProjectPayload);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Legacy Project");
  });

  it("parses JSON tag payloads", () => {
    const tags = parseTagsOutput(jsonTagPayload);
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("home");
  });

  it("parses legacy tag payloads", () => {
    const tags = parseTagsOutput(legacyTagPayload);
    expect(tags).toHaveLength(1);
    expect(tags[0].taskCount).toBe(4);
  });

  it("throws on malformed legacy payloads", () => {
    expect(() => parseTasksOutput("only-one-field")).toThrowError(
      /Unrecognized task payload/,
    );
    expect(() => parseTasksOutput("a|||b")).toThrowError(
      /Invalid legacy task payload/,
    );
    expect(() => parseProjectsOutput("project||")).toThrowError(
      /Unrecognized project payload/,
    );
    expect(() => parseTagsOutput("tag")).toThrowError(
      /Unrecognized tag payload/,
    );
  });
});
