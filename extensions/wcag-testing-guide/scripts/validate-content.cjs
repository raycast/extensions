const assert = require("node:assert/strict");
const { loadModule } = require("./load-typescript.cjs");

const { criteria } = loadModule("src/data.ts");
const { appliesToVersion, criterionMarkdown, standardUrl, understandingUrl, quickReferenceUrl } = loadModule("src/guide.ts");
const { reviewedGuidance } = loadModule("src/reviewed-content.ts");
const { practicalScenarios } = loadModule("src/qa-scenarios.ts");
const { passConditions } = loadModule("src/pass-conditions.ts");
const { aboutWcagMarkdown, howToUseMarkdown, wcag2ictUrl } = loadModule("src/about.ts");
const { aboutMeMarkdown, supportUrl, authorBlogUrl } = loadModule("src/author.ts");

const unique = (values, label) => assert.equal(values.length, new Set(values).size, `Duplicate ${label}`);
const nonblank = (value, label) => assert.ok(typeof value === "string" && value.trim().length > 0, `Missing ${label}`);

assert.equal(Object.keys(practicalScenarios).length, 30, "Exactly 30 focused QA scenarios expected");
assert.equal(criteria.length, 87, "87 distinct criteria across WCAG 2.1 and 2.2 expected");
unique(criteria.map((item) => item.number), "WCAG reference");
unique(criteria.map((item) => item.slug), "W3C anchor slug");
assert.equal(Object.keys(passConditions).length, 71, "Every previously generic pass condition should be authored");
for (const id of Object.keys(passConditions)) {
  assert.ok(criteria.some((item) => item.number === id), `Unknown pass condition ${id}`);
}
const expectedPerVersion = { "2.1": 78, "2.2": 86 };
for (const [version, count] of Object.entries(expectedPerVersion)) {
  const versionCriteria = criteria.filter((item) => appliesToVersion(item, version));
  assert.equal(versionCriteria.length, count, `Incorrect number of WCAG ${version} criteria`);
  for (const criterion of versionCriteria) {
    assert.match(standardUrl(criterion, version), /^https:\/\/www\.w3\.org\/TR\/WCAG(?:21|22)\/#/);
    assert.match(understandingUrl(criterion, version), /^https:\/\/www\.w3\.org\/WAI\/WCAG(?:21|22)\/Understanding\//);
    assert.match(quickReferenceUrl(criterion, version), /^https:\/\/www\.w3\.org\/WAI\/WCAG22\/quickref\/(?:\?versions=2\.1)?#/);
    for (const mode of ["preview", "full"]) {
      const markdown = criterionMarkdown(criterion, version, mode);
      assert.ok(markdown.includes(`${criterion.number} ${criterion.title}`), `${criterion.number} missing heading`);
      assert.ok(!markdown.includes("undefined"), `${criterion.number} has stray 'undefined'`);
      assert.ok(markdown.includes("**Expected for PASS:**"), `${criterion.number} missing pass condition`);
      assert.ok(markdown.includes("In plain language"), `${criterion.number} missing user explanation`);
    }
  }
}
const levels = ["A", "AA", "AAA"];
for (const item of criteria) {
  assert.match(item.number, /^\d\.\d{1,2}\.\d{1,2}$/, `${item.number} invalid number`);
  assert.ok(levels.includes(item.level), `Invalid level for ${item.number}`);
  assert.ok(["2.0", "2.1", "2.2"].includes(item.introduced), `Invalid introduced version ${item.number}`);
  nonblank(item.title, `${item.number} title`);
  nonblank(item.plain, `${item.number} plain explanation`);
  nonblank(item.technical, `${item.number} technical interpretation`);
  assert.ok(item.apply.length >= 1, `No implementation steps for ${item.number}`);
  assert.ok(item.test.length >= 2, `Too few test steps for ${item.number}`);
  const guidance = reviewedGuidance(item);
  nonblank(guidance.pass, `${item.number} pass condition`);
  assert.ok(!guidance.pass.startsWith("Review every applicable instance"), `${item.number} still has generic pass`);
  nonblank(guidance.automation, `${item.number} automation limits`);
  assert.ok(guidance.tests.length >= 2, `Not enough complete testing steps: ${item.number}`);
}
for (const [number, scenario] of Object.entries(practicalScenarios)) {
  assert.ok(criteria.some((item) => item.number === number), `Scenario references unknown criterion ${number}`);
  assert.ok(scenario.web.length >= 2 && scenario.mobile.length >= 2, `Incomplete web or mobile test: ${number}`);
  nonblank(scenario.commonFailure, `${number} practical failure example`);
  nonblank(scenario.evidence, `${number} practical evidence`);
}
assert.equal(criteria.find((item) => item.number === "4.1.1").removedIn22, true);
assert.ok(criteria.filter((item) => item.introduced === "2.2").length === 9);
assert.ok(supportUrl === "https://buycoffee.to/a11yaudit");
assert.ok(wcag2ictUrl.startsWith("https://www.w3.org/TR/"));
assert.ok(aboutMeMarkdown().includes("Support the guide"));
assert.ok(aboutMeMarkdown().includes(`[buy me a coffee](${supportUrl})`), "About Me must include a direct, optional support link");
assert.ok(aboutMeMarkdown().includes(authorBlogUrl), "About Me must link to the blog");
assert.ok(aboutWcagMarkdown("2.2").includes(wcag2ictUrl));
assert.ok(howToUseMarkdown("2.1").includes(wcag2ictUrl));
console.log(`PASS: ${criteria.length} unique entries, ${expectedPerVersion["2.1"]} WCAG 2.1, ${expectedPerVersion["2.2"]} WCAG 2.2, 87 criterion-specific pass conditions and complete guide rendering.`);
