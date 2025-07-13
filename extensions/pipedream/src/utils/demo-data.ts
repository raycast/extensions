import { SavedWorkflow, WorkflowError } from "../types";
import { PIPEDREAM_BASE_URL } from "./constants";

export const DEMO_WORKFLOWS: SavedWorkflow[] = [
  {
    id: "p_demo1",
    customName: "Demo Workflow Alpha",
    folder: "Example Folder",
    url: `${PIPEDREAM_BASE_URL}p_demo1`,
    triggerCount: 1,
    stepCount: 3,
    showInMenuBar: true,
    sortOrder: 0,
  },
  {
    id: "p_demo2",
    customName: "Demo Workflow Beta",
    folder: "Example Folder",
    url: `${PIPEDREAM_BASE_URL}p_demo2`,
    triggerCount: 2,
    stepCount: 5,
    showInMenuBar: false,
    sortOrder: 1,
  },
  {
    id: "p_demo3",
    customName: "Unfoldered Demo",
    folder: "",
    url: `${PIPEDREAM_BASE_URL}p_demo3`,
    triggerCount: 3,
    stepCount: 7,
    showInMenuBar: true,
    sortOrder: 2,
  },
];

const now = Date.now();

export const DEMO_ERRORS: Record<string, WorkflowError[]> = {
  p_demo1: [
    {
      id: "err_demo_1",
      indexed_at_ms: now - 1000 * 60 * 60,
      event: {
        original_event: { name: "demo", site: "example.com", data: {}, d: "", _id: "1", formId: "1" },
        original_context: {
          id: "ctx1",
          ts: "",
          pipeline_id: null,
          workflow_id: "p_demo1",
          deployment_id: "demo",
          source_type: "demo",
          verified: true,
          hops: null,
          test: false,
          replay: false,
          owner_id: "demo-user",
          platform_version: "1",
          workflow_name: "Demo Workflow Alpha",
          resume: null,
          emitter_id: "emit1",
          trace_id: "trace1",
        },
        error: { code: "demo", msg: "Example failure", cellId: "c1", ts: "", stack: "stack" },
      },
      metadata: { emitter_id: "emit1", emit_id: "id1", name: "demo" },
    },
  ],
  p_demo3: [
    {
      id: "err_demo_2",
      indexed_at_ms: now - 1000 * 60 * 30,
      event: {
        original_event: { name: "demo2", site: "example.com", data: {}, d: "", _id: "2", formId: "2" },
        original_context: {
          id: "ctx2",
          ts: "",
          pipeline_id: null,
          workflow_id: "p_demo3",
          deployment_id: "demo",
          source_type: "demo",
          verified: true,
          hops: null,
          test: false,
          replay: false,
          owner_id: "demo-user",
          platform_version: "1",
          workflow_name: "Unfoldered Demo",
          resume: null,
          emitter_id: "emit2",
          trace_id: "trace2",
        },
        error: { code: "demo", msg: "Another failure", cellId: "c2", ts: "", stack: "stack" },
      },
      metadata: { emitter_id: "emit2", emit_id: "id2", name: "demo" },
    },
  ],
};
