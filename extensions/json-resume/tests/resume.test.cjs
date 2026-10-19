const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the real TypeScript entry points with the extension's existing compiler.
// Raycast APIs must be explicitly mocked; unmocked side effects fail immediately.
async function loadSource(relativePath, overrides = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, "..", relativePath);
  if (cache.has(filename)) return cache.get(filename);
  const source = await fs.readFile(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const dependencies = {};
  for (const match of compiled.matchAll(/require\("([^\"]+)"\)/g)) {
    const specifier = match[1];
    if (specifier.startsWith(".")) {
      dependencies[specifier] = await loadSource(
        path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(filename), specifier + ".ts")),
        overrides,
        cache,
      );
    }
  }
  const module = { exports: {} };
  const wrapped = vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename });
  wrapped(
    (specifier) => {
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier === "@raycast/api") throw new Error("Unexpected Raycast API side effect");
      return overrides[specifier] ?? dependencies[specifier] ?? require(specifier);
    },
    module,
    module.exports,
  );
  cache.set(filename, module.exports);
  return module.exports;
}

async function loadComponent(relativePath, mocks) {
  const filename = path.resolve(__dirname, "..", relativePath);
  const source = await fs.readFile(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(
    (specifier) => {
      assert.ok(Object.hasOwn(mocks, specifier), `Unexpected dependency: ${specifier}`);
      return mocks[specifier];
    },
    module,
    module.exports,
  );
  return module.exports.default;
}

const fixture = {
  basics: {
    name: "Example Person",
    label: "Engineer",
    email: "example@example.com",
    phone: "555-0100",
    url: "https://example.com",
    summary: "Basics summary",
    location: {
      address: "Example Street",
      city: "Example City",
      region: "Example Region",
      postalCode: "12345",
      countryCode: "US",
    },
    profiles: [{ network: "Example Network", username: "example-user", url: "https://example.com/profile" }],
  },
  work: [
    {
      name: "Example Employer",
      position: "Example Position",
      url: "https://example.com/work",
      location: "Work Location",
      description: "Employer description",
      startDate: "2020",
      endDate: "2023-06",
      summary: "Work summary",
      highlights: ["Work highlight"],
    },
  ],
  volunteer: [
    {
      organization: "Example Charity",
      position: "Mentor",
      url: "https://example.com/volunteer",
      startDate: "2021",
      endDate: "2022",
      summary: "Volunteer summary",
      highlights: ["Volunteer highlight"],
    },
  ],
  education: [
    {
      institution: "Example University",
      area: "Computer Science",
      studyType: "Bachelor",
      url: "https://example.com/education",
      startDate: "2016",
      endDate: "2020",
      score: "3.7/4.0",
      courses: ["Example Course"],
    },
  ],
  projects: [
    {
      name: "Example Project",
      description: "Project description",
      highlights: ["Project highlight"],
      keywords: ["Project keyword"],
      startDate: "2023-01",
      endDate: "2023-06",
      url: "https://example.com/project",
      roles: ["Project Lead"],
      entity: "Project Entity",
      type: "Application",
    },
  ],
  awards: [{ title: "Example Award", awarder: "Example Awarder", date: "2024", summary: "Award summary" }],
  certificates: [
    { name: "Example Certificate", issuer: "Example Issuer", date: "2024-02", url: "https://example.com/certificate" },
  ],
  publications: [
    {
      name: "Example Publication",
      publisher: "Example Publisher",
      releaseDate: "2024-03",
      url: "https://example.com/publication",
      summary: "Publication summary",
    },
  ],
  skills: [{ name: "Example Skill", level: "Advanced", keywords: Array.from({ length: 12 }, (_, i) => `Keyword${i}`) }],
  languages: [{ language: "English", fluency: "Fluent" }],
  interests: [{ name: "Example Interest", keywords: ["Interest keyword"] }],
  references: [{ name: "Example Reference", reference: "Reference text" }],
};

function strings(value) {
  if (typeof value === "string") return [value];
  return Object.values(value).flatMap(strings);
}

test("both commands use the shared renderer", async () => {
  for (const command of ["open-resume.tsx", "search-resumes.tsx"]) {
    const source = await fs.readFile(path.resolve(__dirname, "../src", command), "utf8");
    assert.match(source, /import \{ makeMarkdownFromResume \} from "\.\/utils\/renderResume"/);
    assert.match(source, /setMarkdown\(makeMarkdownFromResume\(resumeObj\)\)/);
  }
});

test("Create Resume restores draft fields verbatim and keeps defaults for fresh launches", async () => {
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  let initialValues;
  const Editor = await loadComponent("src/components/ResumeEditor.tsx", {
    "react/jsx-runtime": jsx,
    react: { useRef: (current) => ({ current }), useState: () => [undefined, () => {}] },
    "@raycast/api": { useNavigation: () => ({}), Action: {}, Form: {} },
    "@raycast/utils": {
      useForm: (options) => {
        initialValues = options.initialValues;
        return { itemProps: {} };
      },
    },
    "../utils/resumeDocuments": {},
  });
  const Command = await loadComponent("src/create-resume.tsx", {
    "react/jsx-runtime": jsx,
    "./components/ResumeEditor": { default: Editor },
  });

  for (const draftValues of [
    { title: "My draft", resumeJson: '{\n  "basics": { "name": "Draft Person" }\n}' },
    { title: "", resumeJson: '{ "unfinished":' },
    { title: "", resumeJson: "" },
  ]) {
    const element = Command({ draftValues });
    assert.equal(element.props.enableDrafts, true);
    element.type(element.props);
    assert.deepEqual(initialValues, draftValues);
  }
  Editor(Command({}).props);
  assert.deepEqual(initialValues, { title: "Untitled Resume", resumeJson: "{}" });
});

// Keep hook state across renders while running the command's real load callback.
async function searchEnvironment({ documents = [], warnings = [], bookmarks = [] } = {}) {
  const state = [];
  const effects = [];
  let cursor = 0;
  let reads = 0;
  const launches = [];
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  const Editor = () => {};
  const Command = await loadComponent("src/search-resumes.tsx", {
    "react/jsx-runtime": jsx,
    react: {
      useState: (initial) => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [
          state[index],
          (value) => {
            state[index] = value;
          },
        ];
      },
      useEffect: (effect) => effects.push(effect),
    },
    "@raycast/api": {
      List: { Item: "item", EmptyView: "empty", Section: "section" },
      ActionPanel: "actions",
      Action: Object.assign(() => {}, { Push: "push", Style: {} }),
      Icon: {},
      Keyboard: { Shortcut: { Common: {} } },
      LaunchType: { UserInitiated: "user" },
      launchCommand: async (options) => launches.push(options),
    },
    "@raycast/utils": {
      showFailureToast: (error) => {
        throw error;
      },
    },
    "./utils/storage": { getSavedResumes: async () => bookmarks },
    "./utils/resumeDocuments": {
      listResumeDocuments: async () => {
        reads++;
        return { documents, warnings };
      },
    },
    "./utils/validateResume": {},
    "./utils/renderResume": {},
    "./components/ResumeEditor": { default: Editor },
    "./components/LocalResumeDetail": {},
  });
  function render() {
    cursor = 0;
    return Command();
  }
  render();
  effects[0]();
  await new Promise(setImmediate);
  return { render, launches, Editor, reads: () => reads };
}

function childElements(element) {
  if (!element || typeof element !== "object") return [];
  if (Array.isArray(element)) return element.flatMap(childElements);
  return [element, ...childElements(element.props?.children)];
}

async function assertRecoveryActions(panel, environment) {
  const actions = childElements(panel)
    .filter((element) => typeof element.type === "function")
    .map((element) => element.type(element.props));
  const create = actions.find((element) => element.props.title === "Create Resume");
  const open = actions.find((element) => element.props.title === "Open Resume");
  assert.ok(create, "Create Resume must be available");
  assert.ok(open, "Open Resume must be available");
  assert.equal(create.type, "push");
  assert.equal(create.props.target.type, environment.Editor);
  const reads = environment.reads();
  await create.props.target.props.onSaved();
  assert.equal(environment.reads(), reads + 1, "Saving must reload the list");
  await open.props.onAction();
  assert.deepEqual(environment.launches, [{ name: "open-resume", type: "user" }]);
}

test("empty saved resumes offer working Create Resume and Open Resume actions", async () => {
  const environment = await searchEnvironment();
  const empty = childElements(environment.render()).find((element) => element.type === "empty");
  assert.ok(empty);
  await assertRecoveryActions(empty.props.actions, environment);
});

test("unreadable resume rows retain recovery actions with and without readable records", async () => {
  for (const bookmarks of [[], [{ url: "https://example.com/resume.json", title: "Readable bookmark" }]]) {
    const warnings = ["Broken JSON", "Unsupported record version"];
    const environment = await searchEnvironment({ warnings, bookmarks });
    const elements = childElements(environment.render());
    const rows = elements.filter(
      (element) => element.type === "item" && element.props.title === "Unreadable Saved Resume",
    );
    assert.deepEqual(
      rows.map((row) => row.props.subtitle),
      warnings,
    );
    for (const row of rows) {
      environment.launches.length = 0;
      await assertRecoveryActions(row.props.actions, environment);
    }
    if (bookmarks.length) {
      assert.ok(elements.some((element) => element.type === "item" && element.props.title === "Readable bookmark"));
    }
  }
});

async function documentEnvironment() {
  const items = new Map([["savedResumes", JSON.stringify([{ url: "https://example.com/resume.json" }])]]);
  const api = {
    LocalStorage: {
      getItem: async (key) => items.get(key),
      setItem: async (key, value) => {
        items.set(key, value);
      },
      removeItem: async (key) => {
        items.delete(key);
      },
      allItems: async () => Object.fromEntries(items),
    },
    Action: { Style: { Destructive: "destructive" } },
  };
  const overrides = { "@raycast/api": api };
  return { items, api, overrides, storage: await loadSource("src/utils/resumeDocuments.ts", overrides) };
}

test("local documents persist, retain custom fields, and isolate duplicate titles and bookmarks", async () => {
  const { items, storage, overrides } = await documentEnvironment();
  const bookmark = items.get("savedResumes");
  const resume = { ...fixture, custom: { nested: [1, 2, 3] } };
  const first = await storage.createResumeDocument({
    title: " Engineer ",
    resumeJson: JSON.stringify(resume),
    sourceUrl: "https://example.com",
  });
  const second = await storage.createResumeDocument({ title: "Engineer", resumeJson: "{}" });
  assert.notEqual(first.id, second.id);
  assert.equal(first.title, "Engineer");
  const fresh = await loadSource("src/utils/resumeDocuments.ts", overrides);
  assert.deepEqual((await fresh.getResumeDocument(first.id)).resume, resume);
  const updated = await fresh.updateResumeDocument({
    id: first.id,
    title: "Senior Engineer",
    resumeJson: JSON.stringify({ ...resume, basics: { ...resume.basics, label: "Senior" } }),
  });
  assert.equal(updated.id, first.id);
  assert.equal(updated.createdAt, first.createdAt);
  assert.equal(updated.sourceUrl, first.sourceUrl);
  assert.deepEqual(updated.resume.custom, resume.custom);
  assert.deepEqual(updated.resume.work, resume.work);
  await fresh.deleteResumeDocument(first.id);
  await assert.rejects(fresh.getResumeDocument(first.id), /not found/);
  assert.equal((await fresh.getResumeDocument(second.id)).title, "Engineer");
  assert.equal(items.get("savedResumes"), bookmark);
});

test("deletion wins over an update from a separate execution before and after its write", async () => {
  for (const pauseAfterWrite of [false, true]) {
    const { storage, api, overrides, items } = await documentEnvironment();
    const doc = await storage.createResumeDocument({ title: "Engineer", resumeJson: "{}" });
    const updater = await loadSource("src/utils/resumeDocuments.ts", overrides);
    const originalSetItem = api.LocalStorage.setItem;
    let resumeWrite;
    let signalPaused;
    const paused = new Promise((resolve) => { signalPaused = resolve; });
    const released = new Promise((resolve) => { resumeWrite = resolve; });
    api.LocalStorage.setItem = async (key, value) => {
      if (key === "resumeDocument:v1:" + doc.id) {
        if (pauseAfterWrite) await originalSetItem(key, value);
        signalPaused();
        await released;
        if (pauseAfterWrite) return;
      }
      await originalSetItem(key, value);
    };
    const update = updater.updateResumeDocument({ id: doc.id, title: "Updated", resumeJson: "{}" });
    const rejected = assert.rejects(update, /not found/);
    await paused;
    await storage.deleteResumeDocument(doc.id);
    resumeWrite();
    await rejected;
    await assert.rejects(storage.getResumeDocument(doc.id), /not found/);
    assert.deepEqual((await storage.listResumeDocuments()).documents, []);
    assert.equal(items.has("resumeDocument:v1:" + doc.id), false);

    // Even a stale physical write cannot make a deleted ID visible in a fresh execution.
    items.set("resumeDocument:v1:" + doc.id, JSON.stringify(doc));
    const fresh = await loadSource("src/utils/resumeDocuments.ts", overrides);
    await assert.rejects(fresh.getResumeDocument(doc.id), /not found/);
    assert.deepEqual((await fresh.listResumeDocuments()).documents, []);
  }
});

test("deletion succeeds despite cleanup failures and a fresh listing retries cleanup", async () => {
  const { storage, api, overrides, items } = await documentEnvironment();
  const doc = await storage.createResumeDocument({ title: "Test", resumeJson: "{}" });
  const key = "resumeDocument:v1:" + doc.id;
  const originalRemoveItem = api.LocalStorage.removeItem;
  api.LocalStorage.removeItem = async () => { throw new Error("Cleanup failed"); };
  const tool = await loadSource("src/tools/delete-resume.ts", overrides);
  assert.deepEqual(await tool.default({ id: doc.id }), { id: doc.id, deleted: true });
  assert.equal(items.has(key), true);
  await assert.rejects(storage.getResumeDocument(doc.id), /not found/);
  const fresh = await loadSource("src/utils/resumeDocuments.ts", overrides);
  assert.deepEqual(await fresh.listResumeDocuments(), { documents: [], warnings: [] });
  assert.equal(items.has(key), true);
  api.LocalStorage.removeItem = originalRemoveItem;
  assert.deepEqual(await fresh.listResumeDocuments(), { documents: [], warnings: [] });
  assert.equal(items.has(key), false);
  assert.equal(items.get("deletedResumeDocument:v1:" + doc.id), true);
});

test("invalid creates, edits, and unknown IDs leave storage unchanged", async () => {
  const { items, storage } = await documentEnvironment();
  const doc = await storage.createResumeDocument({ title: "Test", resumeJson: "{}" });
  const before = [...items];
  for (const resumeJson of ["invalid", "null", "[]", '"{}"', '{"work":[{"startDate":"yesterday"}]}']) {
    await assert.rejects(storage.createResumeDocument({ title: "Invalid", resumeJson }));
    await assert.rejects(storage.updateResumeDocument({ id: doc.id, title: "Invalid", resumeJson }));
  }
  await assert.rejects(storage.createResumeDocument({ title: "  ", resumeJson: "{}" }), /Title/);
  await assert.rejects(storage.updateResumeDocument({ id: "missing", title: "Test", resumeJson: "{}" }), /not found/);
  await assert.rejects(storage.deleteResumeDocument("missing"), /not found/);
  assert.deepEqual([...items], before);
});

test("listing reports corrupt records and sorts readable documents deterministically", async () => {
  const { items, storage } = await documentEnvironment();
  const first = await storage.createResumeDocument({ title: "First", resumeJson: "{}" });
  const second = await storage.createResumeDocument({ title: "Second", resumeJson: "{}" });
  for (const doc of [first, second]) {
    doc.updatedAt = "2025-01-01T00:00:00.000Z";
    items.set("resumeDocument:v1:" + doc.id, JSON.stringify(doc));
  }
  items.set("resumeDocument:v1:broken", "invalid");
  items.set("resumeDocument:v1:future", JSON.stringify({ ...first, id: "future", version: 2 }));
  items.set("resumeDocument:v1:mismatch", JSON.stringify(first));
  const { documents, warnings } = await storage.listResumeDocuments();
  assert.deepEqual(
    documents.map((doc) => doc.id),
    [first.id, second.id].sort(),
  );
  assert.equal(warnings.length, 3);
  assert.equal(items.get("resumeDocument:v1:broken"), "invalid");
  await assert.rejects(storage.getResumeDocument("future"), /Invalid/);
});

test("document storage propagates read, write, list, and deletion-marker failures", async () => {
  const { storage, api } = await documentEnvironment();
  const doc = await storage.createResumeDocument({ title: "Test", resumeJson: "{}" });
  api.LocalStorage.allItems = async () => {
    throw new Error("List failed");
  };
  await assert.rejects(storage.listResumeDocuments(), /List failed/);
  const originalSetItem = api.LocalStorage.setItem;
  api.LocalStorage.setItem = async () => {
    throw new Error("Write failed");
  };
  await assert.rejects(storage.createResumeDocument({ title: "Test", resumeJson: "{}" }), /Write failed/);
  await assert.rejects(storage.updateResumeDocument({ id: doc.id, title: "Test", resumeJson: "{}" }), /Write failed/);
  await assert.rejects(storage.deleteResumeDocument(doc.id), /Write failed/);
  api.LocalStorage.setItem = originalSetItem;
  assert.equal((await storage.getResumeDocument(doc.id)).id, doc.id);
  api.LocalStorage.getItem = async () => {
    throw new Error("Read failed");
  };
  await assert.rejects(storage.getResumeDocument(doc.id), /Read failed/);
});

test("AI tools share local storage, filter summaries, confirm mutations, and preserve edits", async () => {
  const { items, overrides } = await documentEnvironment();
  const tools = {};
  for (const name of ["list", "get", "save", "update", "delete"]) {
    tools[name] = await loadSource(`src/tools/${name}-resume${name === "list" ? "s" : ""}.ts`, overrides);
  }
  const saved = await tools.save.default({ title: "Engineer", resumeJson: JSON.stringify(fixture) });
  assert.ok(saved.id);
  assert.ok(await tools.save.confirmation({ title: "Engineer", resumeJson: "{}" }));
  const beforeReads = [...items];
  const list = await tools.list.default({ query: "example person" });
  assert.equal(list.resumes[0].id, saved.id);
  assert.equal(list.resumes[0].resume, undefined);
  assert.deepEqual((await tools.get.default({ id: saved.id })).resume, fixture);
  assert.deepEqual([...items], beforeReads);
  assert.equal((await tools.list.default({ query: "unmatched" })).resumes.length, 0);
  const input = { id: saved.id, title: "Renamed", resumeJson: JSON.stringify(fixture) };
  assert.ok(await tools.update.confirmation(input));
  await tools.update.default(input);
  assert.deepEqual((await tools.get.default({ id: saved.id })).resume, fixture);
  assert.equal((await tools.get.default({ id: saved.id })).title, "Renamed");
  assert.equal((await tools.delete.confirmation({ id: saved.id })).style, "destructive");
  await tools.delete.default({ id: saved.id });
  await assert.rejects(tools.get.default({ id: saved.id }), /not found/);
  await assert.rejects(tools.update.default(input), /not found/);
});

test("local storage and AI reads work with network access disabled", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected network request");
  };
  try {
    const { storage, overrides } = await documentEnvironment();
    const doc = await storage.createResumeDocument({ title: "Offline", resumeJson: JSON.stringify(fixture) });
    const get = await loadSource("src/tools/get-resume.ts", overrides);
    const list = await loadSource("src/tools/list-resumes.ts", overrides);
    assert.equal((await storage.listResumeDocuments()).documents.length, 1);
    assert.deepEqual((await get.default({ id: doc.id })).resume, fixture);
    assert.equal((await list.default({})).resumes[0].id, doc.id);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("renders all standard sections and complete affected field values", async () => {
  const { makeMarkdownFromResume } = await loadSource("src/utils/renderResume.ts");
  const { validateResume } = await loadSource("src/utils/validateResume.ts");
  assert.equal((await validateResume(fixture)).valid, true);
  const markdown = makeMarkdownFromResume(fixture);
  for (const value of strings(fixture)) assert.ok(markdown.includes(value), `Missing ${value}`);
  assert.match(markdown, /Score: 3\.7\/4\.0/);
  assert.match(markdown, /Keyword11/);
});

test("handles missing fields, empty sections, and schema-valid partial entries", async () => {
  const { makeMarkdownFromResume } = await loadSource("src/utils/renderResume.ts");
  const { validateResume } = await loadSource("src/utils/validateResume.ts");
  assert.equal(makeMarkdownFromResume({}), "# (no name)");
  for (const key of Object.keys(fixture)) {
    const partial = key === "basics" ? { basics: { profiles: [{}], location: {} } } : { [key]: [{}] };
    assert.equal((await validateResume(partial)).valid, true);
    assert.doesNotMatch(makeMarkdownFromResume(partial), /undefined|null| —\s*(?:\n|$)/);
    if (key !== "basics") assert.equal(makeMarkdownFromResume({ [key]: [] }), "# (no name)");
  }
  assert.doesNotMatch(makeMarkdownFromResume({ education: [{ endDate: "2020" }] }), /\* —/);
});

test("retains legacy aliases and prefers canonical schema values", async () => {
  const { makeMarkdownFromResume } = await loadSource("src/utils/renderResume.ts");
  const legacy = {
    basics: { website: "https://legacy.example.com" },
    work: [{ company: "Legacy Employer", website: "https://legacy.example.com/work" }],
    education: [{ gpa: "4.0", summary: "Legacy education summary" }],
  };
  const rendered = makeMarkdownFromResume(legacy);
  for (const value of strings(legacy)) assert.ok(rendered.includes(value));
  const canonical = makeMarkdownFromResume({
    basics: { ...legacy.basics, url: "https://canonical.example.com" },
    work: [{ ...legacy.work[0], name: "Canonical Employer", url: "https://canonical.example.com/work" }],
    education: [{ gpa: "4.0", score: "3.5" }],
  });
  assert.doesNotMatch(canonical, /legacy\.example|Legacy Employer|4\.0/);
  assert.match(canonical, /Score: 3\.5/);
});

test("tool returns validated full resumes and fragments without side effects", async () => {
  let writes = 0;
  const tool = await loadSource("src/tools/text-to-resume.tsx", {
    "fs/promises": {
      writeFile: () => {
        writes++;
        throw new Error("Unexpected write");
      },
    },
  });
  for (const resume of [
    fixture,
    { education: fixture.education },
    {},
    { basics: { website: "https://legacy.example.com" } },
  ]) {
    const input = { resumeJson: JSON.stringify(resume) };
    assert.equal(await tool.confirmation(input), undefined);
    assert.equal(await tool.default(input), JSON.stringify(resume, null, 2));
  }
  assert.equal(writes, 0);
});

test("rejects invalid JSON and schema fields before writing", async () => {
  let writes = 0;
  const tool = await loadSource("src/tools/text-to-resume.tsx", {
    "fs/promises": {
      writeFile: () => {
        writes++;
      },
    },
  });
  for (const resumeJson of [
    "invalid",
    "null",
    "[]",
    "42",
    '"string"',
    '"{}"',
    '"[]"',
    '{"education":[{"score":4}]}',
    '{"projects":[{"highlights":"bad"}]}',
    '{"work":[{"startDate":"yesterday"}]}',
    '{"basics":{"url":"invalid"}}',
  ]) {
    await assert.rejects(tool.default({ resumeJson, outputPath: "/unused/test.json" }), /JSON|Resume/);
  }
  assert.equal(writes, 0);
});

test("explicit file output is confirmed, writes returned JSON, and preserves existing files", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "json-resume-test-"));
  try {
    const tool = await loadSource("src/tools/text-to-resume.tsx");
    const input = { resumeJson: JSON.stringify(fixture), outputPath: path.join(directory, "resume.json") };
    const confirmation = await tool.confirmation(input);
    assert.equal(confirmation.info[0].value, input.outputPath);
    assert.match(confirmation.message, /not be overwritten/);
    const output = await tool.default(input);
    assert.equal(await fs.readFile(input.outputPath, "utf8"), output);
    await assert.rejects(tool.default({ ...input, resumeJson: "{}" }), { code: "EEXIST" });
    assert.equal(await fs.readFile(input.outputPath, "utf8"), output);
    await assert.rejects(tool.default({ ...input, outputPath: path.join(directory, "missing", "resume.json") }), {
      code: "ENOENT",
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
