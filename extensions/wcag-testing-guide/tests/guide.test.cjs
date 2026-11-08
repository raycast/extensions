const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadModule } = require("../scripts/load-typescript.cjs");
const { criteria } = loadModule("src/data.ts");
const { appliesToVersion, criterionMarkdown, standardUrl } = loadModule("src/guide.ts");
const { reviewedGuidance } = loadModule("src/reviewed-content.ts");
const { aboutWcagMarkdown } = loadModule("src/about.ts");
const { aboutMeMarkdown } = loadModule("src/author.ts");

test("WCAG 2.1 includes 4.1.1; WCAG 2.2 excludes it", () => {
  const parsing = criteria.find((item) => item.number === "4.1.1");
  assert.equal(appliesToVersion(parsing, "2.1"), true);
  assert.equal(appliesToVersion(parsing, "2.2"), false);
});

test("WCAG 2.2-only criteria are excluded from WCAG 2.1", () => {
  for (const criterion of criteria.filter((item) => item.introduced === "2.2")) {
    assert.equal(appliesToVersion(criterion, "2.1"), false, criterion.number);
    assert.equal(appliesToVersion(criterion, "2.2"), true, criterion.number);
  }
});

test("all 87 criteria have precise pass conditions", () => {
  const generated = criteria.map((criterion) => reviewedGuidance(criterion).pass);
  assert.equal(generated.length, 87);
  for (const sentence of generated) {
    assert.ok(sentence.length >= 70, `Suspiciously short pass condition: ${sentence}`);
    assert.doesNotMatch(sentence, /Pass when every applicable instance/);
  }
});

test("preview is shorter than full guide for every criterion", () => {
  for (const criterion of criteria) {
    const version = criterion.introduced === "2.2" ? "2.2" : "2.1";
    const preview = criterionMarkdown(criterion, version, "preview");
    const full = criterionMarkdown(criterion, version, "full");
    assert.ok(preview.length < full.length, criterion.number);
    assert.ok(preview.includes("Press **Enter**"), criterion.number);
    assert.ok(full.includes("## How to test it"), criterion.number);
    assert.ok(full.includes("## Official W3C resources"), criterion.number);
    assert.ok(full.includes(standardUrl(criterion, version)), criterion.number);
  }
});

test("support is optional and discoverable from the author action, never criterion guides", () => {
  assert.match(aboutMeMarkdown(), /all features will remain free/);
  assert.match(aboutMeMarkdown(), /\[buy me a coffee\]\(https:\/\/buycoffee\.to\/a11yaudit\)/i);
  const sample = criterionMarkdown(criteria[0], "2.2", "full");
  assert.doesNotMatch(sample, /buycoffee\.to/);
});

test("manual test case includes traceable evidence for every criterion", () => {
  const { testCaseMarkdown } = loadModule("src/guide.ts");
  for (const criterion of criteria) {
    const version = criterion.introduced === "2.2" ? "2.2" : "2.1";
    const caseText = testCaseMarkdown(criterion, version);
    assert.match(caseText, /## Manual test steps/);
    assert.match(caseText, /## Expected result \(PASS condition\)/);
    assert.match(caseText, /\*\*Actual result:\*\*/);
    assert.match(caseText, /\*\*Result:\*\* \[Not tested \/ Pass \/ Fail \/ Not applicable \/ Blocked\]/);
    assert.ok(caseText.includes(`${criterion.number} ${criterion.title}`));
    assert.ok(caseText.includes(standardUrl(criterion, version)));
  }
});

test("WCAG 2.1 Quick Reference links preserve the correct version filter", () => {
  const { quickReferenceUrl } = loadModule("src/guide.ts");
  const example = criteria.find((item) => item.number === "4.1.2");
  assert.equal(quickReferenceUrl(example, "2.1"), "https://www.w3.org/WAI/WCAG22/quickref/?versions=2.1#name-role-value");
  assert.equal(quickReferenceUrl(example, "2.2"), "https://www.w3.org/WAI/WCAG22/quickref/#name-role-value");
});

test("30 high-use criteria include web and mobile scenarios, failure and evidence", () => {
  const { practicalScenarios } = loadModule("src/qa-scenarios.ts");
  assert.equal(Object.keys(practicalScenarios).length, 30);
  for (const criterion of criteria) {
    const version = criterion.introduced === "2.2" ? "2.2" : "2.1";
    const full = criterionMarkdown(criterion, version, "full");
    if (practicalScenarios[criterion.number]) {
      assert.match(full, /Practical QA scenarios/);
      assert.match(full, /Example of a failure/);
      assert.match(full, /Evidence worth collecting/);
    }
  }
});

test("no test case is pre-marked as passed", () => {
  const { testCaseMarkdown } = loadModule("src/guide.ts");
  for (const item of criteria) {
    const version = item.introduced === "2.2" ? "2.2" : "2.1";
    const report = testCaseMarkdown(item, version);
    assert.match(report, /Test status:\*\* Not tested/);
    assert.match(report, /Result:\*\* \[Not tested/);
    assert.doesNotMatch(report, /\*\*Result:\*\* Pass/);
  }
});


test("WCAG orientation remains separate from the author information", () => {
  for (const version of ["2.1", "2.2"]) {
    const markdown = aboutWcagMarkdown(version);
    assert.match(markdown, new RegExp(`WCAG ${version}:`));
    assert.match(markdown, /## What conformance means in practice/);
    assert.doesNotMatch(markdown, /## About me/);
    assert.match(markdown, /https:\/\/www\.w3\.org\/TR\/wcag2ict\//);
    assert.match(markdown, new RegExp(`https://www\\.w3\\.org/TR/WCAG${version.replace(".", "")}/`));

  }
});


test("About screen includes sourced international legal orientation and review date", () => {
  for (const version of ["2.1", "2.2"]) {
    const guide = aboutWcagMarkdown(version);
    for (const fragment of ["European Accessibility Act", "Web Accessibility Directive", "EN 301 549 v4.1.1", "United Kingdom", "ADA Title II", "Section 508", "ADA Title III", "7 November 2026"]) {
      assert.ok(guide.includes(fragment), `Missing ${fragment}`);
    }
    assert.doesNotMatch(guide, /For projects in Poland/);
    assert.match(guide, /\[EU EAA\]\(https:\/\/commission\.europa\.eu\//);
    assert.match(guide, /\[US ADA Title II\]\(https:\/\/www\.ada\.gov\//);
    assert.match(guide, /\[UK accessibility guidance\]\(https:\/\/www\.gov\.uk\//);
    assert.ok(guide.trimEnd().endsWith("*Regulatory information last checked: 7 November 2026. Check the latest local rules before assessing a product. This is guidance, not legal advice.*"));
  }
});
