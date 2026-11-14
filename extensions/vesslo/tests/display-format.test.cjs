const test = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");
const Module = require("node:module");
const {
  displayText,
  markdownText,
  formatDate,
  countLabel,
  sourceLabel,
  installedAppIconPath,
} = require(join(process.env.VESSLO_TEST_BUILD, "utils/display-format.js"));

const originalLoad = Module._load;
Module._load = function (request) {
  if (request === "@raycast/api")
    return {
      Color: { Red: "red", Orange: "orange", SecondaryText: "secondary" },
      Icon: { Warning: "Warning" },
    };
  return originalLoad.apply(this, arguments);
};
const { auditReviewMarkdown, auditWarningAccessory } = require(
  join(process.env.VESSLO_TEST_BUILD, "utils/audit-warning.js"),
);
Module._load = originalLoad;
const fixture = require("./fixtures/current-app.json");

test("display text removes controls and bidi while bounding Unicode characters", () => {
  assert.equal(displayText(" A\u202Eevil\u2066\0\tB\nC\u2069 "), "Aevil B C");
  assert.equal(displayText("😀😀😀", 2), "😀…");
  assert.equal(displayText("a".repeat(800)), `${"a".repeat(239)}…`);
});

function codeSpanText(span) {
  const delimiter = span.match(/^`+/)?.[0];
  assert.ok(delimiter);
  assert.ok(span.endsWith(delimiter));
  let content = span.slice(delimiter.length, -delimiter.length);
  assert.equal(content.includes("\n"), false);
  for (const run of content.match(/`+/g) ?? [])
    assert.ok(run.length < delimiter.length);
  if (content.startsWith(" ") && content.endsWith(" ") && content.trim())
    content = content.slice(1, -1);
  return content;
}

test("untrusted Markdown links, images, HTML and backticks remain literal inside one code span", () => {
  const malicious =
    "[Open](vesslo://update/all) ![image](https://invalid)\n# trusted <b>x</b> `code` \\ &#91;";
  const escaped = markdownText(malicious);
  assert.equal(codeSpanText(escaped), displayText(malicious, 1024));
  assert.equal(escaped.includes("\n"), false);
});

test("Raycast link-shaped reasons are code literals without entities or stray escape slashes", () => {
  const reason = "[literal](https://example.invalid)";
  assert.equal(markdownText(reason), "`[literal](https://example.invalid)`");
  const detail = auditReviewMarkdown(
    { ...fixture, securityReasons: [reason] },
    "review",
  );
  assert.ok(detail.includes(markdownText(reason)));
  assert.equal(codeSpanText(markdownText(reason)), reason);
  assert.equal(detail.includes("\\]\\("), false);
});

test("backtick and newline escape attempts cannot terminate the enclosing code span", () => {
  for (const value of [
    "`[escape](https://example.invalid)",
    "```![image](https://example.invalid)`````",
    "``\n[escape](https://example.invalid)\n``",
    "```",
    "a`b``c```d",
    "`".repeat(1200) + "[escape](https://example.invalid)",
  ])
    assert.equal(
      codeSpanText(markdownText(value, 360)),
      displayText(value, 360),
    );
});

test("dates use explicit UTC and invalid values never echo injected text", () => {
  assert.equal(
    formatDate("2026-09-10T04:30:12+09:00"),
    "2026-09-09 19:30:12 UTC",
  );
  assert.equal(
    formatDate("[click](vesslo://update/all)"),
    "Unknown (invalid date)",
  );
  assert.equal(formatDate(null), null);
});

test("counts and source names have consistent user-facing forms", () => {
  assert.equal(countLabel(0), "0 apps");
  assert.equal(countLabel(1), "1 app");
  assert.equal(countLabel(2), "2 apps");
  assert.equal(countLabel(1, "review"), "1 review");
  for (const source of ["Brew", "homebrew", "Homebrew"])
    assert.equal(sourceLabel(source), "Homebrew");
  for (const source of ["App Store", "appStore", "mas"])
    assert.equal(sourceLabel(source), "App Store");
  assert.equal(sourceLabel("x\u202Ey"), "xy");
});

test("native icons require a ready installed app with an available absolute bundle path", () => {
  const app = {
    ...fixture,
    path: "/Applications/Example.app",
    isDeleted: false,
  };
  const ready = {
    status: "ready",
    data: null,
    pathAvailability: { [app.path]: "available" },
  };
  assert.equal(installedAppIconPath(app, ready), app.path);
  for (const status of ["missing", "stale", "loading", "permissionDenied"])
    assert.equal(installedAppIconPath(app, { ...ready, status }), null);
  assert.equal(installedAppIconPath({ ...app, isDeleted: true }, ready), null);
  for (const availability of ["missing", "permissionDenied", "unknown"])
    assert.equal(
      installedAppIconPath(app, {
        ...ready,
        pathAvailability: { [app.path]: availability },
      }),
      null,
    );
  for (const path of [
    "relative.app",
    "/tmp/not-an-app.png",
    "/Applications/Bad\0.app",
  ])
    assert.equal(
      installedAppIconPath(
        { ...app, path },
        { ...ready, pathAvailability: { [path]: "available" } },
      ),
      null,
    );
});

test("detail includes app identity and update metadata even without active audits", () => {
  const app = {
    ...fixture,
    name: "Example",
    sources: ["Brew"],
    securityReasons: [],
    managementReasons: [],
    updateHealthStatus: null,
  };
  const detail = auditReviewMarkdown(app);
  for (const label of [
    "Installed version",
    "Target version",
    "Sources",
    "Homebrew cask",
    "Bundle ID",
    "App path",
  ])
    assert.ok(detail.includes(`**${label}:**`), label);
  assert.ok(detail.includes("Homebrew"));
  assert.ok(detail.includes("No active review items."));
});

test("audit reasons and source identity are escaped, bounded and safe for prototype names", () => {
  const app = {
    ...fixture,
    name: "Injected\n# Heading\u202E",
    securityReasons: [
      "__proto__",
      ...Array(30).fill("[X](vesslo://update/all)" + "z".repeat(1200)),
    ],
    updateHealthStatus: "stale",
    updateHealthReasons: ["constructor"],
    updateHealthSource: "<script>\u202E",
    updateHealthSourceIdentity: "![img](https://invalid)",
    lastUpdateSourceAttemptAt: "bad\n# date",
  };
  const detail = auditReviewMarkdown(app);
  assert.equal(detail.includes("\n# Heading"), false);
  assert.equal(detail.includes("\u202E"), false);
  assert.ok(detail.includes(markdownText(app.securityReasons[1], 360)));
  assert.ok(detail.includes("11 additional reasons"));
  assert.ok(detail.includes("Unknown (invalid date)"));
  assert.ok(detail.length < 13000);
  const tooltip = auditWarningAccessory(app).tooltip;
  assert.ok(tooltip.length < 2800);
  assert.equal(tooltip.includes("\u202E"), false);
});

test("one compact warning retains every active reason category and the action restriction", () => {
  const app = {
    ...fixture,
    securityReasons: ["unsignedApp", "notNotarized"],
    updateHealthStatus: "stale",
    updateHealthReasons: ["updateCheckStale"],
    updateHealthSource: "Sparkle",
    updateHealthSourceIdentity: "com.example.source",
    managementReasons: ["noMemoOrTags", "subscriptionApp", "updateAvailable"],
  };
  const restriction =
    "The selected Homebrew proof expired. Reload before reviewing.";
  const warning = auditWarningAccessory(app, restriction);
  assert.equal(warning.text, "Security");
  assert.equal(warning.icon.tintColor, "red");
  assert.equal(warning.tag, undefined);
  for (const reason of [
    "Unsigned app",
    "Not notarized",
    "Update check is stale",
    "Sparkle",
    "com.example.source",
    "No memo or tags",
    "Subscription app",
    restriction,
  ])
    assert.ok(warning.tooltip.includes(reason), reason);
  assert.equal(warning.tooltip.includes("updateAvailable"), false);
  const detail = auditReviewMarkdown(app, "review");
  for (const section of [
    "Security Review",
    "Update Source Review",
    "Management Review",
  ])
    assert.ok(detail.includes(section), section);
});

test("compact warnings use the highest active severity without duplicating Review labels", () => {
  const source = {
    ...fixture,
    updateHealthStatus: "stale",
    updateHealthReasons: ["updateCheckStale"],
  };
  assert.equal(
    auditWarningAccessory(source, "Reload required").text,
    "Source check",
  );
  assert.equal(auditWarningAccessory(source).icon.tintColor, "orange");
  const management = { ...fixture, managementReasons: ["noMemoOrTags"] };
  assert.equal(auditWarningAccessory(management).text, "Review");
  assert.equal(auditWarningAccessory(management).icon.tintColor, "secondary");
  assert.equal(
    auditWarningAccessory(management, "Reload required").icon.tintColor,
    "orange",
  );
  assert.equal(auditWarningAccessory(fixture), null);
  assert.equal(
    auditWarningAccessory(fixture, "Reload required").text,
    "Review",
  );
});

test("Review details prioritize reasons while Updates retain metadata first", () => {
  const app = { ...fixture, name: "Example", securityReasons: ["unsignedApp"] };
  const review = auditReviewMarkdown(app, "review");
  const updates = auditReviewMarkdown(app);
  assert.ok(review.startsWith("# `Example`\n"));
  assert.ok(
    review.indexOf("Unsigned app") < review.indexOf("Installed version"),
  );
  assert.ok(
    updates.indexOf("Installed version") < updates.indexOf("Unsigned app"),
  );
  assert.ok(review.includes("## App Details"));
  assert.ok(
    review.endsWith("Open the app in Vesslo for full context and actions."),
  );
});
