import assert from "node:assert/strict";
import test from "node:test";
import { sortProjectsByPreference } from "../src/lib/projects";
import type { Project } from "../src/lib/types";

function project(id: string, name: string, isPreferred = false): Project {
  return {
    id,
    name,
    type: "client",
    isActive: true,
    isPreferred,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("puts the preferred project first", () => {
  const sorted = sortProjectsByPreference([
    project("b", "Beta"),
    project("a", "Alpha"),
    project("p", "Preferred", true),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.id),
    ["p", "a", "b"],
  );
});

test("does not mutate the original project array", () => {
  const projects = [project("b", "Beta"), project("a", "Alpha")];
  sortProjectsByPreference(projects);
  assert.deepEqual(
    projects.map((item) => item.id),
    ["b", "a"],
  );
});
