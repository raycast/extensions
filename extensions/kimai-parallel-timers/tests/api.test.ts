import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Kimai, Entry, normalizeUrl, duration } from "../src/api";
const entry: Entry = {
  id: 1,
  begin: "2026-10-19T10:00:00+00:00",
  end: null,
  duration: 0,
  description: "Work",
  project: { id: 2, name: "Project" },
  activity: { id: 3, name: "Activity" },
  tags: ["dev"],
};
function mock(limit = 3, overlapping = true, count = 2) {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const transport: typeof fetch = async (input, init) => {
    const path = String(input).split("/api")[1];
    calls.push({
      path,
      method: init?.method ?? "GET",
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const value =
      path === "/config/timesheet"
        ? { activeEntriesHardLimit: limit, isAllowOverlapping: overlapping }
        : path === "/timesheets/active"
          ? Array.from({ length: count }, (_, i) => ({ ...entry, id: i + 1 }))
          : { ...entry, id: 9 };
    return new Response(JSON.stringify(value), { status: 200 });
  };
  return {
    api: new Kimai("https://kimai.test/subdir", "secret", transport),
    calls,
  };
}
test("starting and resuming preserve all other timers", async () => {
  const { api, calls } = mock();
  await api.start({ project: 2, activity: 3 });
  await api.resume(entry);
  assert.equal(calls.filter((c) => c.method === "POST").length, 2);
  assert.equal(calls.filter((c) => /stop|restart/.test(c.path)).length, 0);
  assert.deepEqual(calls.at(-1)?.body, {
    project: 2,
    activity: 3,
    description: "Work",
    tags: "dev",
  });
});
test("single-timer mode, disabled overlap, and exhausted limit block writes", async () => {
  for (const [limit, overlap, count] of [
    [1, true, 1],
    [3, false, 1],
    [2, true, 2],
  ] as const) {
    const { api, calls } = mock(limit, overlap, count);
    await assert.rejects(() => api.start({}));
    assert.equal(calls.filter((c) => c.method !== "GET").length, 0);
  }
});
test("stopping one uses only the selected ID; stopping all uses every active ID", async () => {
  const { api, calls } = mock();
  await api.stop(2);
  assert.deepEqual(
    calls.map((c) => c.path),
    ["/timesheets/2/stop"],
  );
  calls.length = 0;
  assert.equal(await api.stopAll(), 2);
  assert.deepEqual(
    calls
      .filter((c) => c.method === "PATCH")
      .map((c) => c.path)
      .sort(),
    ["/timesheets/1/stop", "/timesheets/2/stop"],
  );
});
test("partial stop-all failure is reported without retrying mutations", async () => {
  const calls: string[] = [];
  const api = new Kimai("https://test.example", "secret", async (input) => {
    const path = String(input);
    calls.push(path);
    return path.endsWith("/active")
      ? new Response(JSON.stringify([entry, { ...entry, id: 2 }]))
      : path.endsWith("/2/stop")
        ? new Response('{"message":"Forbidden"}', { status: 403 })
        : new Response(JSON.stringify(entry));
  });
  await assert.rejects(() => api.stopAll(), /Stopped 1\/2.*2/);
  assert.equal(calls.length, 3);
});
test("subdirectory URL, authentication, redirect refusal, and error redaction", async () => {
  assert.equal(
    normalizeUrl("https://test.example/kimai/api/"),
    "https://test.example/kimai",
  );
  assert.throws(() => normalizeUrl("https://user:pass@test.example"));
  const api = new Kimai(
    "https://test.example/kimai",
    "secret",
    async (input, init) => {
      assert.equal(
        String(input),
        "https://test.example/kimai/api/timesheets/active",
      );
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer secret",
      );
      assert.equal(init?.redirect, "error");
      return new Response('{"message":"secret invalid"}', { status: 401 });
    },
  );
  await assert.rejects(
    () => api.active(),
    (error) =>
      error instanceof Error &&
      !error.message.includes("secret") &&
      error.message.includes("401"),
  );
});
test("running and stopped durations use timestamps and recorded duration respectively", () => {
  assert.equal(duration(entry, Date.parse("2026-10-19T11:05:00Z")), "1h 05m");
  assert.equal(
    duration({ ...entry, end: "2026-10-19T12:00:00Z", duration: 3600 }),
    "1h 00m",
  );
});

test("Kimai form validation errors with HTTP 200 are not treated as success", async () => {
  const api = new Kimai(
    "https://test.example",
    "secret",
    async () =>
      new Response(
        '{"errors":{"children":{"project":{"errors":["Required"]}}}}',
        { status: 200 },
      ),
  );
  await assert.rejects(
    () => api.request("/timesheets", "POST", {}),
    /Required/,
  );
});

test("project icons use Kimai generated color when explicit color is absent", async () => {
  const { projectColor } = await import("../src/api");
  assert.equal(
    projectColor({
      id: 1,
      name: "Project",
      color: null,
      "color-safe": "#12ab34",
    }),
    "#12ab34",
  );
  assert.equal(
    projectColor({
      id: 1,
      name: "Project",
      color: "#ff0000",
      "color-safe": "#12ab34",
    }),
    "#ff0000",
  );
  assert.equal(
    projectColor({
      id: 1,
      name: "Project",
      color: "",
      "color-safe": "#12ab34",
    }),
    "#12ab34",
  );
  assert.equal(projectColor(1), undefined);
  assert.equal(projectColor({ id: 1, name: "Project" }), undefined);
});
