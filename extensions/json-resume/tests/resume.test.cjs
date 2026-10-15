const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the real TypeScript entry points with the extension's existing compiler.
// Any attempt to use Raycast AI, clipboard, storage, or UI APIs fails immediately.
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
      if (specifier === "@raycast/api") throw new Error("Unexpected Raycast API side effect");
      return overrides[specifier] ?? dependencies[specifier] ?? require(specifier);
    },
    module,
    module.exports,
  );
  cache.set(filename, module.exports);
  return module.exports;
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
