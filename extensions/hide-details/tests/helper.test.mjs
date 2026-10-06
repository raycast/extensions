import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = mkdtempSync(path.join(tmpdir(), "hide-details-test-"));
const input = path.join(directory, "input.png");
const numericInput = path.join(directory, "numeric.png");
let sequence = 0;

before(() => {
  execFileSync("xcrun", [
    "swift",
    "-module-cache-path",
    path.join(directory, "module-cache"),
    path.join(root, "tests/create-fixture.swift"),
    input,
  ]);
  execFileSync("xcrun", [
    "swift",
    "-module-cache-path",
    path.join(directory, "module-cache"),
    path.join(root, "tests/create-numeric-fixture.swift"),
    numericInput,
  ]);
  copyFileSync(path.join(root, "tests/custom-regex.swift"), path.join(directory, "main.swift"));
  execFileSync("xcrun", [
    "swiftc",
    "-module-cache-path",
    path.join(directory, "module-cache"),
    path.join(root, "swift/CustomRegex.swift"),
    path.join(directory, "main.swift"),
    "-o",
    path.join(directory, "test-custom-regex"),
  ]);
});

after(() => rmSync(directory, { recursive: true, force: true }));

function redact({
  recognition,
  categories = "email,phone,card,secret,ip,name,face",
  style = "blackout",
  padding = "4",
  customRegex,
} = {}) {
  const output = path.join(directory, `output-${sequence++}.png`);
  const args = [input, output, style, padding, categories, "ProjectNebula"];
  if (recognition || customRegex !== undefined) args.push(recognition ?? "fast");
  if (customRegex !== undefined) args.push(customRegex);
  const report = JSON.parse(
    execFileSync(path.join(root, "assets/hide-details"), args, { encoding: "utf8", timeout: 90_000 }),
  );
  assert.equal(report.output, output);
  assert.ok(Number.isSafeInteger(report.regionCount) && report.regionCount >= 0);
  for (const hit of report.hits) {
    assert.ok(["ocr", "face", "rule"].includes(hit.confidenceSource));
    assert.ok(hit.box.x >= 0 && hit.box.y >= 0 && hit.box.width > 0 && hit.box.height > 0);
    assert.ok(hit.box.x + hit.box.width <= 1200 && hit.box.y + hit.box.height <= 600);
  }
  const png = readFileSync(output);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 600);
  return report;
}

for (const recognition of [undefined, "fast", "accurate"]) {
  test(`${recognition ?? "default"} recognition preserves supported sensitive-text detections`, () => {
    const { hits } = redact({ recognition });
    for (const kind of ["email", "phone", "card", "secret", "ip", "name"]) {
      assert.ok(
        hits.some((hit) => hit.kind === kind),
        `missing ${kind} detection`,
      );
    }
    assert.ok(
      hits.some((hit) => hit.kind === "email" && hit.text.replaceAll(/\s/g, "").includes("sample@example.com")),
    );
    assert.ok(hits.some((hit) => hit.kind === "name" && hit.text.replaceAll(/\s/g, "") === "ProjectNebula"));
    const phones = hits.filter((hit) => hit.kind === "phone");
    assert.equal(phones.length, 1, "secret digits must not produce an extra phone detection");
    assert.equal(phones[0].text.replaceAll(/\D/g, ""), "14155550123");
  });
}

for (const style of ["pixelate", "blur"]) {
  test(`fast recognition writes a full-size ${style} image`, () => {
    assert.ok(redact({ style }).hits.some((hit) => hit.kind === "email"));
  });
}

test("text-only selection returns only the selected category", () => {
  const { hits } = redact({ categories: "email" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, "email");
});

test("phone-only selection excludes secret digits even when secret detection is disabled", () => {
  const { hits } = redact({ categories: "phone" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].text.replaceAll(/\D/g, ""), "14155550123");
});

test("face-only selection does not return text detections", () => {
  assert.deepEqual(redact({ categories: "face" }).hits, []);
});

test("empty category selection produces a valid image without detections", () => {
  assert.deepEqual(redact({ categories: "" }).hits, []);
});

test("custom regex syntax, flags, Unicode, empty matches, and time limits", () => {
  execFileSync(path.join(directory, "test-custom-regex"), { timeout: 5_000 });
});

test("custom regex triggers OCR and redaction with built-in categories disabled", () => {
  const { hits } = redact({ categories: "", customRegex: String.raw`^4111(?:\s+1111){3}$` });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, "custom");
  assert.equal(hits[0].text.replaceAll(/\s/g, ""), "4111111111111111");
});

test("custom regex alternatives match multiple OCR lines alongside built-ins", () => {
  const { hits } = redact({ categories: "email", customRegex: String.raw`(?i)proj\s*ectnebula|^4111` });
  assert.equal(hits.filter((hit) => hit.kind === "custom").length, 2);
  assert.equal(hits.filter((hit) => hit.kind === "email").length, 1);
});

test("custom regex reports the full matching OCR line", () => {
  const { hits } = redact({ categories: "face", customRegex: "415" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, "custom");
  assert.ok(hits[0].text.includes("555"));
});

test("empty, unmatched, and zero-width custom rules leave no custom detections", () => {
  for (const customRegex of ["", "never-match-this", "^"]) {
    assert.deepEqual(redact({ categories: "", customRegex }).hits, []);
  }
});

test("invalid custom regex fails before reading the image or creating output", () => {
  const output = path.join(directory, "invalid-regex.png");
  assert.throws(
    () =>
      execFileSync(
        path.join(root, "assets/hide-details"),
        [path.join(directory, "missing.png"), output, "blackout", "4", "", "", "fast", "["],
        { encoding: "utf8", stdio: "pipe", timeout: 5_000 },
      ),
    (error) => {
      assert.equal(error.status, 2);
      assert.match(error.stderr, /Invalid Custom Regex/);
      assert.equal(error.stdout, "");
      return true;
    },
  );
  assert.equal(existsSync(output), false);
});

for (const [field, value, message] of [
  ["style", "invisible", /Invalid redaction style/],
  ["padding", "-12.5", /Invalid padding/],
  ["padding", "NaN", /Invalid padding/],
  ["padding", "Infinity", /Invalid padding/],
  ["padding", "1001", /Invalid padding/],
  ["categories", "email,typo", /Unknown category/],
  ["recognition", "guess", /Invalid text recognition/],
]) {
  test(`invalid ${field} ${value} fails before reading the image or publishing output`, () => {
    const output = path.join(directory, `invalid-${sequence++}.png`);
    const options = { style: "blackout", padding: "4", categories: "", recognition: "fast", [field]: value };
    assert.throws(
      () =>
        execFileSync(
          path.join(root, "assets/hide-details"),
          [
            path.join(directory, "missing.png"),
            output,
            options.style,
            options.padding,
            options.categories,
            "",
            options.recognition,
          ],
          { encoding: "utf8", stdio: "pipe", timeout: 5_000 },
        ),
      (error) => {
        assert.equal(error.status, 2);
        assert.match(error.stderr, message);
        assert.equal(error.stdout, "");
        return true;
      },
    );
    assert.equal(existsSync(output), false);
  });
}

for (const recognition of ["fast", "accurate"]) {
  test(`${recognition} OCR detects numbers beside expiry and ticket digits`, () => {
    const output = path.join(directory, `numeric-output-${sequence++}.png`);
    const report = JSON.parse(
      execFileSync(
        path.join(root, "assets/hide-details"),
        [numericInput, output, "blackout", "4", "card,phone", "", recognition],
        { encoding: "utf8", timeout: 90_000 },
      ),
    );
    assert.ok(
      report.hits.some((hit) => hit.kind === "card" && hit.text.includes("Exp")),
      "missing card beside expiry",
    );
    assert.ok(
      report.hits.some((hit) => hit.kind === "phone" && hit.text.includes("Ticket")),
      "missing phone beside ticket",
    );
    assert.equal(report.hits.filter((hit) => hit.kind === "phone" && hit.text.includes("Exp")).length, 0);
    assert.ok(
      report.hits.some((hit) => hit.kind === "phone" && hit.text.replaceAll(/\D/g, "").includes("4155550123987654321")),
      "missing phone beside unlabelled digits",
    );
    assert.ok(
      report.hits.some((hit) => hit.kind === "phone" && hit.text.replaceAll(/\s/g, "").includes("2125559876")),
      "missing adjacent phone numbers",
    );
    assert.ok(
      report.hits.some((hit) => hit.kind === "phone" && hit.text.replaceAll(/\s/g, "").includes("192.168.10.20")),
      "missing phone before IPv4",
    );
    assert.equal(
      report.hits.filter((hit) => hit.kind === "card" && hit.text.replaceAll(/\s/g, "").includes("192.168.10.20"))
        .length,
      0,
    );
    assert.equal(report.regionCount, 6);
  });

  test(`${recognition} OCR masks dotted cards with only the card category enabled`, () => {
    const output = path.join(directory, `dotted-card-${sequence++}.png`);
    const report = JSON.parse(
      execFileSync(
        path.join(root, "assets/hide-details"),
        [numericInput, output, "blackout", "4", "card", "", recognition],
        { encoding: "utf8", timeout: 90_000 },
      ),
    );
    assert.ok(report.hits.every((hit) => hit.kind === "card"));
    assert.ok(report.hits.some((hit) => hit.text.replaceAll(/\s/g, "").includes("4111.1111.1111.1111")));
    const reportFile = path.join(directory, `dotted-card-${sequence++}.json`);
    writeFileSync(reportFile, JSON.stringify(report));
    execFileSync("xcrun", [
      "swift",
      "-module-cache-path",
      path.join(directory, "module-cache"),
      path.join(root, "tests/check-blackout.swift"),
      output,
      reportFile,
    ]);
  });
}

test("padding boundaries and fractional padding keep masks inside the image", () => {
  for (const padding of ["0", "0.5", "1000"]) {
    const report = redact({ categories: "email", padding });
    assert.equal(report.regionCount, 1);
    assert.ok(report.hits.some((hit) => hit.kind === "email"));
    if (padding === "1000") {
      assert.deepEqual(report.hits[0].box, { x: 0, y: 0, width: 1200, height: 600 });
    }
  }
});

test("one line matching two categories reports one unique masked region", () => {
  const report = redact({ categories: "name", customRegex: String.raw`(?i)proj\s*ect\s*nebula` });
  assert.ok(report.hits.some((hit) => hit.kind === "custom" && hit.confidenceSource === "ocr"));
  assert.ok(report.hits.some((hit) => hit.kind === "name" && hit.confidenceSource === "rule"));
  assert.equal(report.regionCount, 1);
});
