import { GcpResource } from "./types";

export const GCP_RESOURCES: GcpResource[] = [
  {
    id: "welcome",
    name: "Welcome / Dashboard",
    path: "welcome",
    keywords: ["welcome", "dashboard", "home", "overview"],
  },
  {
    id: "cloud-run-services",
    name: "Cloud Run Services",
    path: "run/services",
    keywords: ["cloud run", "cr", "service", "services", "cr ser"],
  },
  {
    id: "cloud-run-jobs",
    name: "Cloud Run Jobs",
    path: "run/jobs",
    keywords: ["cloud run jobs", "run jobs", "jobs", "job"],
  },
  {
    id: "cloud-build",
    name: "Cloud Build",
    path: "cloud-build/builds",
    keywords: ["cloud build", "build", "cb"],
  },
  {
    id: "iam",
    name: "IAM",
    path: "iam-admin/iam",
    keywords: ["iam", "roles", "permissions", "identity"],
  },
  {
    id: "cloud-storage",
    name: "Cloud Storage Buckets",
    path: "storage/browser",
    keywords: ["storage", "gcs", "bucket", "buckets"],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    path: "bigquery",
    keywords: ["bigquery", "bq", "sql", "warehouse"],
  },
  {
    id: "logs-explorer",
    name: "Logs Explorer",
    path: "logs/query",
    keywords: ["logs", "logging", "log explorer"],
  },
  {
    id: "cloud-functions",
    name: "Cloud Functions",
    path: "functions",
    keywords: ["functions", "cloud functions", "cf"],
  },
  {
    id: "pubsub",
    name: "Pub/Sub Topics",
    path: "cloudpubsub/topic/list",
    keywords: ["pubsub", "pub/sub", "topics", "ps"],
  },
  {
    id: "cloud-scheduler",
    name: "Cloud Scheduler",
    path: "cloudscheduler",
    keywords: ["scheduler", "cron", "cloud scheduler"],
  },
];

export function buildResourceUrl(
  rawPath: string,
  rawProjectId: string,
): string {
  const path = encodeURI(rawPath.replace(/^\/+/, ""));
  const projectId = encodeURIComponent(rawProjectId);
  return `https://console.cloud.google.com/${path}?project=${projectId}`;
}

export function buildWelcomeUrl(projectId: string): string {
  return `https://console.cloud.google.com/welcome?project=${projectId}`;
}
