import assert from "node:assert/strict";
import { test } from "node:test";
import { workflowFieldIsEmpty, workflowFieldValue, workflowRunInput, type WorkflowInput } from "../src/lib/workflow";

function field(change: Partial<WorkflowInput> & Pick<WorkflowInput, "key" | "kind">): WorkflowInput {
  return { label: change.key, options: [], required: false, initialValue: "", hasSavedValue: false, ...change };
}

const select = field({
  key: "style",
  kind: "select",
  options: [
    { value: "photo", title: "Photo" },
    { value: "anime", title: "Anime" },
  ],
});
const savedPrompt = field({ key: "prompt", kind: "text", initialValue: "a red fox", hasSavedValue: true });
const savedSteps = field({ key: "steps", kind: "number", initialValue: "30", hasSavedValue: true });
const savedToken = field({ key: "api_token", kind: "text", initialValue: "", hasSavedValue: true });

test("a dropdown with no saved value sends the option it shows", () => {
  assert.equal(workflowFieldValue(select, {}), "photo");
  assert.deepEqual(workflowRunInput([select], {}), { style: "photo" });
  assert.equal(workflowFieldIsEmpty({ ...select, required: true }, {}), false);
  assert.deepEqual(workflowRunInput([select], { style: "anime" }), { style: "anime" });
});

test("untouched fields keep the saved values", () => {
  assert.deepEqual(workflowRunInput([savedPrompt, savedToken], {}), {});
  assert.equal(workflowFieldIsEmpty({ ...savedPrompt, required: true }, {}), false);
  assert.equal(workflowFieldIsEmpty({ ...savedToken, required: true }, {}), false);
});

test("a cleared text field is sent empty instead of falling back to the saved value", () => {
  assert.deepEqual(workflowRunInput([savedPrompt, savedToken], { prompt: "  ", api_token: "" }), {
    prompt: "",
    api_token: "",
  });
  assert.equal(workflowFieldIsEmpty({ ...savedPrompt, required: true }, { prompt: "" }), true);
  assert.deepEqual(workflowRunInput([savedPrompt], { prompt: "a blue fox" }), { prompt: "a blue fox" });
  assert.deepEqual(workflowRunInput([savedPrompt], { prompt: "a red fox" }), {});
});

test("a cleared number uses the saved value, since there is no empty number", () => {
  assert.deepEqual(workflowRunInput([savedSteps], { steps: "" }), {});
  assert.equal(workflowFieldIsEmpty({ ...savedSteps, required: true }, { steps: "" }), false);
  assert.deepEqual(workflowRunInput([savedSteps], { steps: "12" }), { steps: 12 });
  const unsaved = field({ key: "seed", kind: "number", required: true });
  assert.equal(workflowFieldIsEmpty(unsaved, {}), true);
});

test("checkboxes always send their state", () => {
  const box = field({ key: "upscale", kind: "checkbox", initialValue: "true" });
  assert.deepEqual(workflowRunInput([box], {}), { upscale: true });
  assert.deepEqual(workflowRunInput([box], { upscale: false }), { upscale: false });
});
