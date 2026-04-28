const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { buildIconData, normaliseSvg, toDisplayName } = require("./generate-icons");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-icons-test-"));
  const sourceRoot = path.join(root, "source");
  const dataDir = path.join(root, "data");
  const outputDir = path.join(root, "assets", "icons");
  const outlineDir = path.join(sourceRoot, "icons", "16", "outline");
  const filledDir = path.join(sourceRoot, "icons", "16", "filled");

  fs.mkdirSync(outlineDir, { recursive: true });
  fs.mkdirSync(filledDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(
    path.join(sourceRoot, "mapping.json"),
    `${JSON.stringify(
      {
        "arrow-right": 60060,
        "arrow-right-filled": 62315,
        missing: 62000,
      },
      null,
      2,
    )}\n`,
  );

  fs.writeFileSync(
    path.join(outlineDir, "arrow-right.svg"),
    '<svg><path fill="#1B1B1B" opacity="0.9" d="M0 0h1v1H0z"/></svg>\n',
  );
  fs.writeFileSync(path.join(filledDir, "arrow-right.svg"), '<svg><path fill="#1B1B1B" d="M0 0h1v1H0z"/></svg>\n');
  fs.writeFileSync(
    path.join(dataDir, "tags.json"),
    `${JSON.stringify({ "arrow-right": ["next", "forward"], "arrow-right-filled": ["solid"] }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dataDir, "concepts.json"),
    `${JSON.stringify(
      [
        { concept: "Forward", iconName: "arrow-right" },
        { concept: "Missing", iconName: "not-real" },
      ],
      null,
      2,
    )}\n`,
  );

  return { root, sourceRoot, dataDir, outputDir };
}

test("toDisplayName converts kebab-case icon names", () => {
  assert.equal(toDisplayName("arrow-right-filled"), "Arrow Right Filled");
});

test("normaliseSvg replaces hardcoded fills and strips opacity", () => {
  assert.equal(normaliseSvg('<svg><path fill="#1B1B1B" opacity="0.4"/></svg>'), '<svg><path fill="currentColor"/></svg>');
});

test("buildIconData emits icons, assets, tags, and concepts", () => {
  const fixture = makeFixture();

  try {
    const result = buildIconData({
      sourceRoot: fixture.sourceRoot,
      dataDir: fixture.dataDir,
      outputDir: fixture.outputDir,
    });

    assert.equal(result.data.icons.length, 2);
    assert.deepEqual(result.skipped, ["missing"]);
    assert.equal(result.data.concepts.length, 1);
    assert.equal(result.skippedConcepts.length, 1);

    const outlineIcon = result.data.icons.find((icon) => icon.name === "arrow-right");
    assert.ok(outlineIcon);
    assert.equal(outlineIcon.unicode, String.fromCodePoint(60060));
    assert.equal(outlineIcon.displayName, "Arrow Right");
    assert.equal(outlineIcon.style, "outline");
    assert.equal(outlineIcon.asset, "icons/16/outline/arrow-right.svg");
    assert.deepEqual(outlineIcon.tags, ["next", "forward"]);

    const filledIcon = result.data.icons.find((icon) => icon.name === "arrow-right-filled");
    assert.ok(filledIcon);
    assert.equal(filledIcon.style, "filled");
    assert.equal(filledIcon.asset, "icons/16/filled/arrow-right-filled.svg");

    assert.ok(fs.existsSync(path.join(fixture.outputDir, "data.json")));
    assert.ok(fs.existsSync(path.join(fixture.outputDir, "16", "outline", "arrow-right.svg")));
    assert.ok(fs.existsSync(path.join(fixture.outputDir, "16", "filled", "arrow-right-filled.svg")));
  } finally {
    fs.rmSync(fixture.root, { recursive: true, force: true });
  }
});
