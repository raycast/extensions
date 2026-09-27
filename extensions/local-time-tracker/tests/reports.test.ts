import assert from "node:assert/strict";
import test from "node:test";
import { createReport } from "../src/lib/reports";
import type { Project, WorkLog } from "../src/lib/types";

const projects: Project[] = [
  {
    id: "client",
    name: "Client A",
    type: "client",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

test("splits a cross-midnight log at the local day boundary", () => {
  const now = new Date(2026, 8, 23, 12, 0, 0);
  const start = new Date(2026, 8, 22, 23, 30, 0);
  const end = new Date(2026, 8, 23, 0, 30, 0);
  const workLogs: WorkLog[] = [
    {
      id: "log",
      projectId: "client",
      description: "Cross midnight",
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      createdAt: end.toISOString(),
      updatedAt: end.toISOString(),
    },
  ];

  const report = createReport("today", workLogs, projects, null, now);
  assert.equal(report.totalSeconds, 30 * 60);
  assert.equal(report.clientSeconds, 30 * 60);
});

test("includes unknown projects in the total", () => {
  const now = new Date(2026, 8, 23, 12, 0, 0);
  const start = new Date(2026, 8, 23, 9, 0, 0);
  const end = new Date(2026, 8, 23, 10, 0, 0);
  const workLogs: WorkLog[] = [
    {
      id: "unknown-log",
      projectId: "missing",
      description: "Unknown project",
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      createdAt: end.toISOString(),
      updatedAt: end.toISOString(),
    },
  ];

  const report = createReport("today", workLogs, projects, null, now);
  assert.equal(report.totalSeconds, 60 * 60);
  assert.equal(report.unknownSeconds, 60 * 60);
});

test("includes custom project categories in the total", () => {
  const customProject = { ...projects[0], id: "custom-project", type: "research" };
  const start = new Date(2026, 8, 23, 9, 0, 0);
  const end = new Date(2026, 8, 23, 9, 30, 0);
  const report = createReport(
    "today",
    [
      {
        id: "custom-log",
        projectId: customProject.id,
        description: "Research",
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        createdAt: end.toISOString(),
        updatedAt: end.toISOString(),
      },
    ],
    [customProject],
    null,
    new Date(2026, 8, 23, 12, 0, 0),
  );

  assert.equal(report.totalSeconds, 30 * 60);
  assert.equal(report.categorySeconds.research, 30 * 60);
});
