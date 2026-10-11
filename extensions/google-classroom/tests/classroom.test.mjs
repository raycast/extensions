import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const temporary = await mkdtemp(join(tmpdir(), "classroom-test-"));
const require = createRequire(import.meta.url);
async function compile(entry, plugins = []) {
  const file = join(temporary, `${Math.random()}.cjs`);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins,
  });
  await writeFile(file, result.outputFiles[0].text);
  return require(file);
}
const { createListClient } = await compile("src/api/listClient.ts");
const MOCK = {
  name: "mock",
  setup(b) {
    b.onResolve({ filter: /^@raycast\/api$|^\.\/googleAuth$/ }, (a) => ({ path: a.path, namespace: "mock" }));
    b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
      contents:
        a.path === "./googleAuth"
          ? 'export const getOAuthToken=()=>"account";export const getAccountEmail=()=>"me";'
          : "export const environment={isDevelopment:false}; export class Cache {m=new Map();get(k){return this.m.get(k)}set(k,v){this.m.set(k,v)}remove(k){this.m.delete(k)}}",
    }));
  },
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function fixture(request) {
  const entries = new Map();
  let time = 1000,
    token = "account-a";
  const cache = {
    get: (key) => entries.get(key),
    set: (key, value) => entries.set(key, value),
    remove: (key) => entries.delete(key),
  };
  return {
    cache,
    entries,
    setTime: (n) => (time = n),
    setToken: (t) => (token = t),
    list: createListClient({ cache, getToken: () => token, now: () => time, request }),
  };
}

test("simultaneous consumers and repeat opens share one request; expires exactly at 30 seconds", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    return json({ courses: [{ id: "one" }] });
  });
  const results = await Promise.all([f.list("courses", "courses"), f.list("courses", "courses")]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(calls, 1);
  f.setTime(30_999);
  await f.list("courses", "courses");
  assert.equal(calls, 1);
  f.setTime(31_000);
  await f.list("courses", "courses");
  assert.equal(calls, 2);
});

test("cache is shared across client instances, isolated by credentials and filters, and contains no token", async () => {
  let calls = 0;
  const request = async () => {
    calls++;
    return json({ courses: [] });
  };
  const f = fixture(request);
  await f.list("courses", "courses", { courseStates: "ACTIVE" });
  const other = createListClient({ cache: f.cache, getToken: () => "account-a", now: () => 1000, request });
  await other("courses", "courses", { courseStates: "ACTIVE" });
  assert.equal(calls, 1);
  await other("courses", "courses", { courseStates: ["ACTIVE", "ARCHIVED"] });
  assert.equal(calls, 2);
  f.setToken("account-b");
  await f.list("courses", "courses", { courseStates: "ACTIVE" });
  assert.equal(calls, 3);
  assert.ok(!JSON.stringify([...f.entries]).includes("account-"));
});

test("force refresh bypasses cache and failed refresh cannot revive the previous result", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    return calls === 2 ? json({ error: { message: "offline" } }, 503) : json({ courses: [calls] });
  });
  assert.deepEqual(await f.list("courses", "courses"), [1]);
  await assert.rejects(f.list("courses", "courses", {}, { force: true }), /offline/);
  assert.deepEqual(await f.list("courses", "courses"), [3]);
});

test("all pages are fetched with the same fields and filters, and only complete lists are cached", async () => {
  let calls = 0,
    fail = true;
  const f = fixture(async (url, init) => {
    calls++;
    const search = new URL(url).searchParams;
    assert.equal(search.get("fields"), "nextPageToken,courses(id)");
    assert.equal(search.get("courseStates"), "ACTIVE");
    assert.equal(init.headers["Accept-Encoding"], "gzip");
    assert.ok(init.signal instanceof AbortSignal);
    assert.match(init.headers["User-Agent"], /gzip/);
    if (!search.has("pageToken")) return json({ courses: [1], nextPageToken: "next" });
    return fail ? json({ error: { message: "retry" } }, 500) : json({ courses: [2] });
  });
  const params = { fields: "nextPageToken,courses(id)", courseStates: "ACTIVE" };
  await assert.rejects(f.list("courses", "courses", params), /retry/);
  assert.equal(f.entries.size, 0);
  fail = false;
  assert.deepEqual(await f.list("courses", "courses", params), [1, 2]);
  assert.equal(calls, 4);
  await f.list("courses", "courses", params);
  assert.equal(calls, 4);
});

test("slow pagination does not extend freshness, damaged cache and non-JSON failures recover", async () => {
  let calls = 0;
  const f = fixture(async () => {
    calls++;
    f.setTime(40_000);
    return json({ courses: [] });
  });
  await f.list("courses", "courses");
  await f.list("courses", "courses");
  assert.equal(calls, 2);
  for (const key of f.entries.keys()) f.entries.set(key, "broken");
  await f.list("courses", "courses");
  assert.equal(calls, 3);
  const bad = fixture(async () => new Response("bad gateway", { status: 502, statusText: "Bad Gateway" }));
  await assert.rejects(bad.list("courses", "courses"), /Bad Gateway/);
});

test("API preserves submissions, attachments, topics, and reuses coursework when opening a stream", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    calls.push(u);
    assert.match(u.searchParams.get("fields"), /^nextPageToken,/);
    const path = u.pathname;
    if (path.endsWith("/courses")) return json({ courses: [{ id: "c", name: "Course", courseState: "ACTIVE" }] });
    if (path.endsWith("studentSubmissions")) {
      assert.equal(u.searchParams.get("userId"), "me");
      return json({
        studentSubmissions: [
          {
            courseWorkId: "w",
            state: "TURNED_IN",
            late: true,
            assignedGrade: 0,
            alternateLink: "submission",
            shortAnswerSubmission: { answer: "answer" },
            // Unlike the materials of a post, a submission holds its Drive file directly and spells `youTubeVideo`
            assignmentSubmission: {
              attachments: [
                { driveFile: { id: "submitted", title: "Work" } },
                { youTubeVideo: { title: "Video", alternateLink: "https://youtu.be/v" } },
              ],
            },
          },
        ],
      });
    }
    if (path.endsWith("courseWork"))
      return json({
        courseWork: [
          {
            id: "w",
            courseId: "c",
            title: "Work",
            workType: "ASSIGNMENT",
            dueDate: { year: 2026, month: 9, day: 1 },
            dueTime: { hours: 10, minutes: 30, seconds: 59, nanos: 500_000_000 },
            alternateLink: "work",
            updateTime: "2026-09-01",
            materials: [
              { link: { url: "https://example.com", title: "Source" } },
              { driveFile: { driveFile: { id: "shared", title: "Shared" }, shareMode: "VIEW" } },
              { youtubeVideo: { title: "Lecture", alternateLink: "https://youtu.be/l" } },
              { gem: { id: "g", title: "Tutor", url: "https://gemini.google.com/gem/g" } },
              { notebook: { id: "n", title: "Notes", url: "https://notebooklm.google.com/notebook/n" } },
            ],
          },
        ],
      });
    if (path.endsWith("topics")) return json({ topic: [{ topicId: "t", name: "Topic" }] });
    if (path.endsWith("announcements"))
      return json({
        announcements: [
          { id: "a", courseId: "c", text: "Announcement", updateTime: "2026-09-02T10:00:00.100Z" },
          // Nothing but an attachment, and a timestamp that sorts wrongly as a string
          {
            id: "b",
            courseId: "c",
            updateTime: "2026-09-02T10:00:00Z",
            materials: [{ link: { url: "u", title: "Slides" } }],
          },
        ],
      });
    if (path.endsWith("courseWorkMaterials")) return json({ courseWorkMaterial: [] });
    throw new Error(path);
  };
  try {
    const result = await compile("src/api/classroom.ts", [
      {
        name: "mock",
        setup(b) {
          b.onResolve({ filter: /^@raycast\/api$|^\.\/googleAuth$/ }, (a) => ({ path: a.path, namespace: "mock" }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            contents:
              a.path === "./googleAuth"
                ? 'export const getOAuthToken=()=>"account";export const getAccountEmail=()=>"me";'
                : "export const environment={isDevelopment:false}; export class Cache {m=new Map();get(k){return this.m.get(k)}set(k,v){this.m.set(k,v)}remove(k){this.m.delete(k)}}",
          }));
        },
      },
    ]);
    const assignments = await result.getAssignments();
    assert.equal(calls.length, 3);
    assert.equal(assignments[0].submission.state, "TURNED_IN");
    assert.equal(assignments[0].submission.assignedGrade, 0);
    assert.equal(assignments[0].submission.attachments[0].driveId, "submitted");
    assert.equal(assignments[0].submission.attachments[1].kind, "youtube");
    assert.equal(assignments[0].dueDate, "2026-09-01T10:30:59.500Z");
    assert.deepEqual(
      assignments[0].attachments.map(({ kind, title }) => [kind, title]),
      [
        ["link", "Source"],
        ["drive", "Shared"],
        ["youtube", "Lecture"],
        ["gem", "Tutor"],
        ["notebook", "Notes"],
      ],
    );
    const stream = await result.getCourseStream("c");
    assert.equal(calls.length, 6);
    assert.deepEqual(
      stream.items.map((item) => item.id),
      ["a", "b", "w"],
    );
    assert.equal(stream.items[1].title, "Slides");
    assert.equal(stream.topics.t, "Topic");
    await result.getAssignments();
    assert.equal(calls.length, 6);
    await result.getAssignments({ force: true });
    assert.equal(calls.length, 9);
    // The courses are known by now, so their work is asked for without waiting for the course list
    const refresh = result.getAssignments({ force: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(
      calls
        .slice(9)
        .map((u) => u.pathname.split("/").at(-1))
        .sort(),
      ["courseWork", "courses", "studentSubmissions"],
    );
    await refresh;
    assert.equal(calls.length, 12);
  } finally {
    globalThis.fetch = original;
  }
});

test("a refresh is not answered by a request that started before it", async () => {
  let calls = 0;
  const releases = [];
  const f = fixture(async () => {
    const call = ++calls;
    await new Promise((resolve) => releases.push(resolve));
    return json({ courses: [call] });
  });
  const stale = f.list("courses", "courses");
  await new Promise((resolve) => setImmediate(resolve));
  const fresh = f.list("courses", "courses", {}, { force: true });
  const shared = f.list("courses", "courses", {}, { force: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2, "the refresh starts its own request, which simultaneous refreshes share");
  releases[1]();
  assert.deepEqual(await fresh, [2]);
  assert.deepEqual(await shared, [2]);
  releases[0]();
  assert.deepEqual(await stale, [1]);
  assert.deepEqual(await f.list("courses", "courses"), [2], "the superseded request must not overwrite the cache");
  assert.equal(calls, 2);
});

test("a failing course or kind of post is reported, never shown as empty", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const path = new URL(url).pathname;
    if (path.endsWith("/courses"))
      return json({
        courses: [
          { id: "ok", name: "Fine", courseState: "ACTIVE" },
          { id: "denied", name: "Denied", courseState: "ACTIVE" },
        ],
      });
    if (path === "/v1/courses/ok") return json({ id: "ok", name: "Fine", courseState: "ACTIVE", creationTime: "2026" });
    if (path === "/v1/courses/stale") return json({ error: { message: "not found" } }, 404);
    // The work itself loads, its submissions don't: it must not be listed as if it wasn't turned in
    if (path.includes("/denied/") && path.endsWith("studentSubmissions"))
      return json({ error: { message: "no permission" } }, 403);
    if (path.endsWith("studentSubmissions")) return json({ studentSubmissions: [] });
    if (path.endsWith("courseWork"))
      return json({ courseWork: [{ id: "w", title: "Work", workType: "ASSIGNMENT", updateTime: "2026-09-01" }] });
    if (path.endsWith("announcements")) return json({ error: { message: "unavailable" } }, 503);
    return json({});
  };
  try {
    const api = await compile("src/api/classroom.ts", [MOCK]);
    let issues = [];
    const all = await api.getAssignments({ issues });
    assert.deepEqual(
      all.map((item) => item.course.name),
      ["Fine"],
    );
    assert.deepEqual(issues, [{ id: "denied", title: "Denied", message: "no permission" }]);
    await assert.rejects(api.getAssignments(), /no permission/, "without a collector nothing is swallowed");
    // Hiding a course means not asking for its work at all, so its failure can't even happen
    assert.equal((await api.getAssignments({ hiddenCourseIds: ["denied"] })).length, 1);

    issues = [];
    const stream = await api.getCourseStream("denied", { issues });
    assert.deepEqual(stream.items, []);
    assert.deepEqual(issues.map((issue) => issue.title).sort(), ["Announcements", "Assignments and Questions"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("group settings allow any permutation, normalize duplicates, and flatten in date order", async () => {
  const model = await compile("src/settings/model.ts", [
    {
      name: "model-api",
      setup(b) {
        b.onResolve({ filter: /^@raycast\/api$|^\.\/googleAuth$/ }, (a) => ({ path: a.path, namespace: "mock" }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
          contents:
            a.path === "./googleAuth"
              ? 'export const getOAuthToken=()=>"account";export const getAccountEmail=()=>"me";'
              : "export const environment={isDevelopment:false}; export class Cache {get(){}set(){}remove(){}}",
        }));
      },
    },
  ]);
  const settings = model.normalizeSettings({ groupOrder: ["done", "done", "unknown", "dueSoon"] });
  assert.deepEqual(settings.groupOrder, ["done", "dueSoon", "missing", "dueLater", "noDueDate"]);
  const moved = model.normalizeSettings({
    groupOrder: ["noDueDate", "dueSoon", "missing", "dueLater", "done"],
  }).groupOrder;
  assert.deepEqual(moved, ["noDueDate", "dueSoon", "missing", "dueLater", "done"]);
  assert.equal(new Set(moved).size, 5);
  const items = [
    { id: "old", updateTime: "2026-01-01", submission: { state: "TURNED_IN" } },
    { id: "new", updateTime: "2026-02-01" },
  ];
  assert.deepEqual(
    model.assignmentSections(items, "all", settings).map((s) => s.key),
    ["done", "noDueDate"],
  );
  const flat = model.assignmentSections(items, "all", { ...settings, groupAssignments: false });
  assert.equal(flat.length, 1);
  assert.equal(flat[0].title, undefined);
  assert.deepEqual(
    flat[0].items.map((i) => i.id),
    ["new", "old"],
  );
  assert.equal(model.assignmentSections(items, "done", settings)[0].items[0].id, "old");
});

test("all assignment rows construct their details without waiting for selection", async () => {
  const ui = await compile("src/components/StreamListItem.tsx", [
    {
      name: "native-ui",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^@raycast\/api$|^react\/jsx-runtime$|^react$|\/api\/classroom$|\/api\/googleAuth$|\/helpers\/actions$|\/helpers\/formatters$|\/helpers\/profiling$/,
          },
          (a) => ({ path: a.path, namespace: "mock-ui" }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock-ui" }, (a) => ({
          contents: a.path.endsWith("/helpers/profiling")
            ? "export const recordRender=(label,started,element)=>element;"
            : a.path === "react/jsx-runtime"
              ? "export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment='Fragment';"
              : a.path.endsWith("/api/classroom")
                ? 'export const getStatus=()=>"assigned";'
                : a.path.endsWith("/api/googleAuth")
                  ? "export const withAuthUser=(s)=>s;"
                  : a.path.endsWith("/helpers/actions")
                    ? "export const downloadAttachments=()=>{};export const sendToAIChat=()=>{};"
                    : a.path.endsWith("/helpers/formatters")
                      ? `export const TYPE_INFO={assignment:{title:"Assignment",icon:"clipboard"}};
        export const STATUS_INFO={assigned:{color:"blue"}};
        export const formatDateTime=()=>"date",formatRelative=()=>"date",formatGrade=()=>undefined,getStatusTitle=()=>"Assigned",getItemDetails=()=>"details",escapeMarkdown=(s)=>s,getAttachmentUrl=(a)=>a.url;
        export const getItemBody=()=>{globalThis.detailBuilds++;return "body";};`
                      : a.path === "react"
                        ? ""
                        : "const component=new Proxy(()=>{}, {get:()=>component});export const Action=component,ActionPanel=component,Color=component,List=component,Icon=component,Image=component,Keyboard=component;",
        }));
      },
    },
  ]);
  globalThis.detailBuilds = 0;
  const item = {
    id: "w",
    courseId: "c",
    title: "Work",
    type: "assignment",
    creationTime: "2026-01-01",
    updateTime: "2026-01-01",
    attachments: [],
  };
  const row = (selected) =>
    ui.default({
      item,
      course: { name: "Course" },
      selected,
      showIcon: false,
      onRefresh: () => {},
      courseAction: null,
    });
  for (let i = 0; i < 200; i++) {
    const rendered = row(i === 0);
    assert.ok(rendered.props.detail);
    assert.equal(rendered.props.icon, undefined);
  }
  assert.equal(globalThis.detailBuilds, 200, "every row should have its detail ready");
  delete globalThis.detailBuilds;
});

test("downloads never share a folder, keep going after a failure and leave no partial file", async () => {
  const original = globalThis.fetch;
  const home = process.env.HOME;
  process.env.HOME = await mkdtemp(join(temporary, "home-"));
  const types = { doc: "application/vnd.google-apps.document", form: "application/vnd.google-apps.form" };
  globalThis.fetch = async (url) => {
    const { pathname, searchParams } = new URL(url);
    const id = pathname.split("/")[4];
    if (searchParams.has("fields")) {
      return json({
        name: id === "long" ? "é".repeat(300) + "?*.pdf" : `${id}: file.pdf`,
        mimeType: types[id] ?? "application/pdf",
      });
    }
    if (id === "broken") {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("partial"));
          controller.error(new Error("connection lost"));
        },
      });
      return new Response(body);
    }
    return new Response(pathname.endsWith("/export") ? "exported" : "content");
  };
  try {
    const { downloadAttachments } = await compile("src/helpers/files.ts", [
      {
        name: "mock-files",
        setup(b) {
          b.onResolve({ filter: /^@raycast\/api$|\/api\/googleAuth$/ }, (a) => ({ path: a.path, namespace: "mock" }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, (a) => ({
            contents: a.path.endsWith("googleAuth")
              ? 'export const getOAuthToken=async()=>"account";'
              : `export const environment={supportPath:${JSON.stringify(join(temporary, "support"))}};`,
          }));
        },
      },
    ]);
    const file = (driveId) => ({ kind: "drive", title: driveId, url: "u", driveId });
    const results = await Promise.all(
      Array.from({ length: 20 }, () => downloadAttachments([file("a")], { folderName: "Course: Work?" })),
    );
    assert.equal(new Set(results.map((result) => result.paths[0])).size, 20);
    assert.ok(results.every((result) => /Course_ Work_( \(\d+\))?\/a_ file\.pdf$/.test(result.paths[0])));

    const mixed = await downloadAttachments(["broken", "doc", "form", "long"].map(file), {
      folderName: "x".repeat(400),
    });
    assert.deepEqual(mixed.failed, [{ name: "broken: file.pdf", message: "connection lost" }]);
    assert.deepEqual(mixed.skipped, ["form: file.pdf"]);
    assert.equal(mixed.paths.length, 2);
    assert.match(mixed.paths[0], /doc_ file\.pdf\.docx$/);
    assert.equal(await readFile(mixed.paths[0], "utf8"), "exported");
    assert.deepEqual((await readdir(join(mixed.paths[0], ".."))).length, 2, "the partial file is removed");

    const nothing = await downloadAttachments([file("form")], { folderName: "Empty" });
    assert.deepEqual(nothing.paths, []);
    assert.ok(!(await readdir(join(process.env.HOME, "Downloads"))).includes("Empty"), "no empty folder is left");

    const [first, second] = await Promise.all(
      [1, 2].map(() => downloadAttachments([file("a")], { folderName: "ai", forAI: true })),
    );
    assert.notEqual(first.paths[0], second.paths[0]);
    assert.equal(await readFile(first.paths[0], "utf8"), "content");
  } finally {
    process.env.HOME = home;
    globalThis.fetch = original;
  }
});

test.after(async () => {
  await rm(temporary, { recursive: true, force: true });
});
