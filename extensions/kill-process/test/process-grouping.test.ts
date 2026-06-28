import * as assert from "node:assert/strict";
import { test } from "node:test";
import { groupRelatedProcesses } from "../src/utils/process-grouping";
import { Process } from "../src/types";

const process = (overrides: Partial<Process>): Process => ({
  id: 1,
  pid: 0,
  cpu: 0,
  mem: 0,
  type: "binary",
  path: "",
  processName: "",
  appName: undefined,
  ...overrides,
});

test("groups app helpers into the main app process", () => {
  const grouped = groupRelatedProcesses([
    process({
      id: 100,
      pid: 1,
      cpu: 2,
      mem: 100,
      type: "app",
      path: "/Applications/Notion.app/Contents/MacOS/Notion",
      processName: "Notion",
      appName: "Notion",
    }),
    process({
      id: 101,
      pid: 100,
      cpu: 1.25,
      mem: 50,
      type: "app",
      path: "/Applications/Notion.app/Contents/Frameworks/Notion Helper.app/Contents/MacOS/Notion Helper",
      processName: "Notion Helper",
      appName: "Notion Helper",
    }),
    process({
      id: 102,
      pid: 100,
      cpu: 0.75,
      mem: 25,
      type: "app",
      path: "/Applications/Notion.app/Contents/Frameworks/Notion Helper (Renderer).app/Contents/MacOS/Notion Helper (Renderer)",
      processName: "Notion Helper (Renderer)",
      appName: "Notion Helper (Renderer)",
    }),
    process({
      id: 200,
      pid: 1,
      cpu: 10,
      mem: 500,
      type: "binary",
      path: "/usr/bin/ssh",
      processName: "ssh",
    }),
  ]);

  assert.equal(grouped.length, 2);

  const notion = grouped.find((item) => item.processName === "Notion");
  assert.ok(notion);
  assert.equal(notion.type, "aggregatedApp");
  assert.equal(notion.cpu, 4);
  assert.equal(notion.mem, 175);
  assert.equal(notion.childProcessCount, 2);
  assert.deepEqual(notion.childProcessIds, [101, 102]);

  assert.ok(grouped.some((item) => item.processName === "ssh"));
});
