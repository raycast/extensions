import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("reviewer artifact manifest is deterministic and truthfully identifies the ad-hoc candidate", () => {
  const first = execFileSync("node", ["scripts/generate-reviewer-artifact-manifest.mjs"], { encoding: "utf8" });
  const second = execFileSync("node", ["scripts/generate-reviewer-artifact-manifest.mjs"], { encoding: "utf8" });
  assert.equal(first, second);
  assert.equal(first, readFileSync("native-review/reviewer-artifact-manifest.json", "utf8"));

  const manifest = JSON.parse(first) as {
    publicTitle: string;
    slug: string;
    command: string;
    helper: {
      architectures: string[];
      signature: { notarizationEvidence: string; storeSigned: boolean; teamIdentifier: string | null };
    };
  };
  assert.equal(manifest.publicTitle, "Per-Device Mouse Scroll");
  assert.equal(manifest.slug, "mouse-scroll-per-device");
  assert.equal(manifest.command, "change-mouse-scroll");
  assert.deepEqual(manifest.helper.architectures, ["arm64", "x86_64"]);
  assert.equal(manifest.helper.signature.teamIdentifier, "not set");
  assert.equal(manifest.helper.signature.storeSigned, false);
  assert.equal(manifest.helper.signature.notarizationEvidence, "not_provided");
});
