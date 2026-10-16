import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import type { getWorkflowDispatchInputs, parseWorkflowDocument } from "./workflow-dispatch";

type WorkflowDispatchModule = {
  getWorkflowDispatchInputs: typeof getWorkflowDispatchInputs;
  parseWorkflowDocument: typeof parseWorkflowDocument;
};

async function loadWorkflowDispatch(): Promise<WorkflowDispatchModule> {
  const moduleUrl = pathToFileURL(resolve("src/helpers/workflow-dispatch.ts")).href;
  return (await import(moduleUrl)) as WorkflowDispatchModule;
}

test("returns null when the workflow is not manually dispatchable", async () => {
  const { getWorkflowDispatchInputs, parseWorkflowDocument } = await loadWorkflowDispatch();

  const document = parseWorkflowDocument("on:\n  push:\n    branches: [main]\n");
  assert.equal(getWorkflowDispatchInputs(document), null);
  assert.equal(getWorkflowDispatchInputs(null), null);
  assert.equal(getWorkflowDispatchInputs("on: pull_request"), null);
});

test("returns an empty list for workflow_dispatch without inputs", async () => {
  const { getWorkflowDispatchInputs, parseWorkflowDocument } = await loadWorkflowDispatch();

  assert.deepEqual(getWorkflowDispatchInputs(parseWorkflowDocument("on: workflow_dispatch")), []);
  assert.deepEqual(getWorkflowDispatchInputs(parseWorkflowDocument("on: [push, workflow_dispatch]")), []);
  assert.deepEqual(getWorkflowDispatchInputs(parseWorkflowDocument("on:\n  workflow_dispatch:\n")), []);
});

test("reads workflow_dispatch when the parser stores the `on` key as a boolean", async () => {
  const { getWorkflowDispatchInputs } = await loadWorkflowDispatch();

  assert.deepEqual(getWorkflowDispatchInputs({ true: "workflow_dispatch" }), []);
  assert.deepEqual(getWorkflowDispatchInputs({ true: { workflow_dispatch: { inputs: {} } } }), []);
});

test("maps declared inputs with defaults, options, and types", async () => {
  const { getWorkflowDispatchInputs, parseWorkflowDocument } = await loadWorkflowDispatch();

  const document = parseWorkflowDocument(
    [
      "on:",
      "  workflow_dispatch:",
      "    inputs:",
      "      environment:",
      "        type: choice",
      "        description: Target environment",
      "        options: [staging, production]",
      "        default: staging",
      "      version:",
      "        description: Version to deploy",
      "        required: true",
      "      verbose:",
      "        type: boolean",
      "        default: false",
      "      region:",
      "        type: environment",
      "      count:",
      "        type: number",
      "        default: 3",
    ].join("\n"),
  );

  assert.deepEqual(getWorkflowDispatchInputs(document), [
    {
      name: "environment",
      description: "Target environment",
      required: false,
      defaultValue: "staging",
      type: "choice",
      options: ["staging", "production"],
    },
    {
      name: "version",
      description: "Version to deploy",
      required: true,
      defaultValue: undefined,
      type: "string",
      options: undefined,
    },
    {
      name: "verbose",
      description: undefined,
      required: false,
      defaultValue: "false",
      type: "boolean",
      options: undefined,
    },
    {
      name: "region",
      description: undefined,
      required: false,
      defaultValue: undefined,
      type: "environment",
      options: undefined,
    },
    {
      name: "count",
      description: undefined,
      required: false,
      defaultValue: "3",
      type: "string",
      options: undefined,
    },
  ]);
});

test("returns null for documents that cannot be parsed", async () => {
  const { parseWorkflowDocument } = await loadWorkflowDispatch();

  assert.equal(parseWorkflowDocument(":\n  - ["), null);
});
