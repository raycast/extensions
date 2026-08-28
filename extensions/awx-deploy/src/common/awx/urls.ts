import { apiBase, getPreferences } from "./client";
import { UnifiedJob } from "./types";

/** Web URL for a template's detail page in the AWX UI. */
export function templateWebUrl(id: number): string {
  const { awxUrl } = getPreferences();
  return `${awxUrl.trim().replace(/\/+$/, "")}/#/templates/job_template/${id}`;
}

/** API URL for a template's survey specification. */
export function surveySpecUrl(kind: "job_templates" | "workflow_job_templates", id: number): string {
  return `${apiBase()}/${kind}/${id}/survey_spec/`;
}

/** Web URL for a workflow template's detail page in the AWX UI. */
export function workflowTemplateWebUrl(id: number): string {
  const { awxUrl } = getPreferences();
  return `${awxUrl.trim().replace(/\/+$/, "")}/#/templates/workflow_job_template/${id}`;
}

/** Web URL for a running workflow job's output page in the AWX UI. */
export function workflowJobWebUrl(id: number): string {
  const { awxUrl } = getPreferences();
  return `${awxUrl.trim().replace(/\/+$/, "")}/#/jobs/workflow/${id}/output`;
}

/** AWX UI route segment per unified job type (mirrors the UI's JOB_TYPE_URL_SEGMENTS). */
const JOB_URL_SEGMENTS: Record<string, string> = {
  job: "playbook",
  project_update: "project",
  inventory_update: "inventory",
  system_job: "management",
  ad_hoc_command: "command",
  workflow_job: "workflow",
};

/** Web URL for a job's output page in the AWX UI. */
export function jobWebUrl(job: UnifiedJob | number): string {
  const { awxUrl } = getPreferences();
  const base = awxUrl.trim().replace(/\/+$/, "");
  if (typeof job === "number") return `${base}/#/jobs/playbook/${job}/output`;
  const kind = JOB_URL_SEGMENTS[job.type] ?? "playbook";
  return `${base}/#/jobs/${kind}/${job.id}/output`;
}
