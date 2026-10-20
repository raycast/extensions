import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Kimai, Entry, entryPayload } from "../src/api";
import { runOnce } from "../src/pending";
const entry: Entry = {
  id: 1,
  begin: "2026-10-20T10:00:00Z",
  end: "2026-10-20T11:00:00Z",
  duration: 3600,
  project: 4,
  activity: 5,
  description: "old",
};
test("recent history treats final-page 404 as empty but preserves authentication and first-page errors", async () => {
  for (const status of [404, 401, 403, 500]) {
    const api = new Kimai(
      "https://test.example",
      "token",
      async () => new Response("{}", { status }),
    );
    if (status === 404) assert.deepEqual(await api.historyPage(2), []);
    else
      await assert.rejects(
        () => api.historyPage(2),
        new RegExp(String(status)),
      );
    await assert.rejects(() => api.historyPage(1), new RegExp(String(status)));
  }
});
test("a full history page followed by 404 retains earlier entries", async () => {
  const rows = Array.from({ length: 100 }, (_, id) => ({ ...entry, id }));
  const api = new Kimai("https://test.example", "token", async (input) =>
    String(input).endsWith("page=1")
      ? new Response(JSON.stringify(rows))
      : new Response("{}", { status: 404 }),
  );
  const pages = await Promise.all([api.historyPage(1), api.historyPage(2)]);
  assert.equal(pages.flat().length, 100);
  assert.equal(pages.at(-1)?.length, 0);
});
test("editing retains the current archived project and activity, but creation lists only visible choices", async () => {
  const calls: string[] = [];
  const api = new Kimai("https://test.example", "token", async (input) => {
    const path = new URL(String(input)).pathname;
    calls.push(path);
    return new Response(
      JSON.stringify(
        path.endsWith("/projects/4")
          ? {
              id: 4,
              name: "Archived project",
              visible: false,
              globalActivities: false,
            }
          : path.endsWith("/activities/5")
            ? { id: 5, name: "Archived activity", visible: false, project: 4 }
            : [],
      ),
    );
  });
  const options = await api.entryOptions(entry);
  assert.equal(options.projects[0].id, 4);
  assert.equal(options.activities[0].id, 5);
  assert.deepEqual(
    entryPayload(
      { project: 4, activity: 5, description: "new", tags: "tag" },
      entry,
    ),
    { description: "new", tags: "tag" },
  );
  assert.deepEqual(
    entryPayload(
      { project: 6, activity: 7, description: "new", tags: "" },
      entry,
    ),
    { description: "new", tags: "", project: 6, activity: 7 },
  );
  calls.length = 0;
  await api.entryOptions();
  assert.equal(calls.length, 2);
});
test("visible current selections are not fetched twice", async () => {
  let count = 0;
  const api = new Kimai("https://test.example", "token", async (input) => {
    count++;
    return new Response(
      JSON.stringify([
        new URL(String(input)).pathname.endsWith("projects")
          ? { id: 4, name: "Project" }
          : { id: 5, name: "Activity", project: 4 },
      ]),
    );
  });
  await api.entryOptions(entry);
  assert.equal(count, 2);
});
test("repeated resume action runs only once while pending, and works again after completion", async () => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const action = async () => {
    calls++;
    await waiting;
  };
  const first = runOnce("resume-test", action);
  await runOnce("resume-test", action);
  assert.equal(calls, 1);
  release();
  await first;
  await runOnce("resume-test", action);
  assert.equal(calls, 2);
});
test("failed pending action releases the guard for retry", async () => {
  await assert.rejects(
    () =>
      runOnce("failure-test", async () => {
        throw new Error("network");
      }),
    /network/,
  );
  let retried = false;
  await runOnce("failure-test", async () => {
    retried = true;
  });
  assert.equal(retried, true);
});
