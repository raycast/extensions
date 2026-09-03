import assert from "node:assert/strict";
import test from "node:test";
import {
  parseStoreSigningInspection,
  storeCodesignArguments,
  storeHelperIdentifier,
  storeReleasePublishDisposition,
  storeSigningFailure,
} from "../src/application/store-release-signing";

const validInspection = `Authority=Developer ID Application: Example (TEAM123)
TeamIdentifier=TEAM123
Identifier=com.brandon.mouse-scroll-per-device.helper
flags=0x10000(runtime)
Runtime Version=14.0.0
Timestamp=2026-08-23 18:00:00 -0400
designated => identifier "com.brandon.mouse-scroll-per-device.helper" and anchor apple generic and certificate leaf[subject.OU] = "TEAM123"`;

function failureFor(replacement: [string, string]): string | undefined {
  return storeSigningFailure(parseStoreSigningInspection(validInspection.replace(...replacement)));
}

test("Store policy accepts a Developer ID helper with runtime, timestamp, and bound requirement", () => {
  assert.equal(storeSigningFailure(parseStoreSigningInspection(validInspection)), undefined);
});

test("Store policy rejects Apple Development even though local runtime may accept it", () => {
  assert.equal(
    failureFor(["Developer ID Application: Example (TEAM123)", "Apple Development: Example (TEAM123)"]),
    "Developer ID Application authority is required for a Store release.",
  );
});

test("Store policy rejects ad hoc/no-team and the wrong exact identifier", () => {
  assert.equal(
    failureFor(["TeamIdentifier=TEAM123", "TeamIdentifier=not set"]),
    "A nonempty TeamIdentifier is required.",
  );
  assert.equal(
    failureFor([storeHelperIdentifier, `${storeHelperIdentifier}.evil`]),
    "The helper identifier is incorrect.",
  );
});

test("Store policy rejects missing runtime, timestamp, and designated-requirement bindings", () => {
  assert.equal(
    failureFor(["flags=0x10000(runtime)\nRuntime Version=14.0.0", "flags=0x0"]),
    "Hardened runtime is required.",
  );
  assert.equal(
    failureFor(["Timestamp=2026-08-23 18:00:00 -0400", "Timestamp=none"]),
    "A secure signing timestamp is required.",
  );
  assert.equal(
    failureFor(["Timestamp=2026-08-23 18:00:00 -0400", "Timestamp="]),
    "A secure signing timestamp is required.",
  );
  assert.equal(
    failureFor([`identifier \"${storeHelperIdentifier}\"`, 'identifier "com.example.wrong"']),
    "The designated requirement must bind the exact identifier, Apple anchor, and team OU.",
  );
});

test("Store policy rejects a designated requirement with team text but no leaf OU binding", () => {
  assert.equal(
    failureFor(['certificate leaf[subject.OU] = "TEAM123"', 'certificate leaf[subject.CN] = "TEAM123"']),
    "The designated requirement must bind the exact identifier, Apple anchor, and team OU.",
  );
  assert.equal(
    failureFor([
      'certificate leaf[subject.OU] = "TEAM123"',
      'certificate leaf[subject.OU] = "OTHER" and info = "TEAM123"',
    ]),
    "The designated requirement must bind the exact identifier, Apple anchor, and team OU.",
  );
});

test("Store staged publish keeps the original artifact when signing or verification fails", () => {
  assert.equal(storeReleasePublishDisposition(false, false), "keep_original");
  assert.equal(storeReleasePublishDisposition(true, false), "keep_original");
  assert.equal(storeReleasePublishDisposition(true, true), "replace_atomically");
});

test("Store signing command construction requires timestamp, hardened runtime, and exact identifier", () => {
  assert.deepEqual(storeCodesignArguments("Developer ID Application: Example (TEAM123)"), [
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--sign",
    "Developer ID Application: Example (TEAM123)",
    "--identifier",
    storeHelperIdentifier,
  ]);
});
