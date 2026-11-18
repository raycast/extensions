import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

type CheckStatePresentation = {
  icon: "Check" | "Xmark" | "Clock";
  text: "Success" | "Failure" | "Pending";
};

type GetCheckStatePresentation = (
  state: "SUCCESS" | "ERROR" | "FAILURE" | "PENDING" | "EXPECTED" | null | undefined,
) => CheckStatePresentation | null;

async function loadCheckStatePresentation(): Promise<GetCheckStatePresentation> {
  const moduleUrl = pathToFileURL(resolve("src/helpers/pull-request-checks.ts")).href;
  const module = (await import(moduleUrl)) as { getCheckStatePresentation: GetCheckStatePresentation };
  return module.getCheckStatePresentation;
}

test("maps aggregate CI states to shared pull request presentation", async () => {
  const getCheckStatePresentation = await loadCheckStatePresentation();

  assert.deepEqual(getCheckStatePresentation("SUCCESS"), { icon: "Check", text: "Success" });
  assert.deepEqual(getCheckStatePresentation("ERROR"), { icon: "Xmark", text: "Failure" });
  assert.deepEqual(getCheckStatePresentation("FAILURE"), { icon: "Xmark", text: "Failure" });
  assert.deepEqual(getCheckStatePresentation("PENDING"), { icon: "Clock", text: "Pending" });
});

test("omits the Checks row when no supported aggregate CI state exists", async () => {
  const getCheckStatePresentation = await loadCheckStatePresentation();

  assert.equal(getCheckStatePresentation("EXPECTED"), null);
  assert.equal(getCheckStatePresentation(null), null);
  assert.equal(getCheckStatePresentation(undefined), null);
});
