import { ConsoleProduct } from "./types";

/**
 * The GCP Products which can be browser directly from the console.
 * Note that the list is taken from the `All Products` page and hardcoded here, due to the fact that it is not possible
 *  to retrieve it programmatically.
 */
export const consoleProducts: ConsoleProduct[] = [
  { name: "IAM & Admin", toUrl: (projectId) => `https://console.cloud.google.com/iam-admin?project=${projectId}` },
  { name: "Billing", toUrl: (projectId) => `https://console.cloud.google.com/billing?project=${projectId}` },
  { name: "APIs & Services", toUrl: (projectId) => `https://console.cloud.google.com/apis?project=${projectId}` },
  { name: "Compute Engine", toUrl: (projectId) => `https://console.cloud.google.com/compute?project=${projectId}` },
  {
    name: "Kubernetes Engine",
    toUrl: (projectId) => `https://console.cloud.google.com/kubernetes?project=${projectId}`,
  },
  { name: "VMware Engine", toUrl: (projectId) => `https://console.cloud.google.com/gve?project=${projectId}` },
  { name: "Anthos", toUrl: (projectId) => `https://console.cloud.google.com/anthos?project=${projectId}` },
  { name: "Cloud Storage", toUrl: (projectId) => `https://console.cloud.google.com/storage?project=${projectId}` },
  { name: "Filestore", toUrl: (projectId) => `https://console.cloud.google.com/filestore?project=${projectId}` },
  { name: "Data Transfer", toUrl: (projectId) => `https://console.cloud.google.com/transfer?project=${projectId}` },
  {
    name: "Cloud Volumes",
    toUrl: (projectId) => `https://console.cloud.google.com/netapp/cloud-volumes?project=${projectId}`,
  },
  { name: "Logging", toUrl: (projectId) => `https://console.cloud.google.com/logs?project=${projectId}` },
  { name: "Monitoring", toUrl: (projectId) => `https://console.cloud.google.com/monitoring?project=${projectId}` },
  { name: "Error Reporting", toUrl: (projectId) => `https://console.cloud.google.com/errors?project=${projectId}` },
  { name: "Trace", toUrl: (projectId) => `https://console.cloud.google.com/traces?project=${projectId}` },
  { name: "Profiler", toUrl: (projectId) => `https://console.cloud.google.com/profiler?project=${projectId}` },
  { name: "Debugger", toUrl: (projectId) => `https://console.cloud.google.com/debug?project=${projectId}` },
  { name: "VPC network", toUrl: (projectId) => `https://console.cloud.google.com/networking?project=${projectId}` },
  {
    name: "Network services",
    toUrl: (projectId) => `https://console.cloud.google.com/net-services?project=${projectId}`,
  },
  { name: "Hybrid Connectivity", toUrl: (projectId) => `https://console.cloud.google.com/hybrid?project=${projectId}` },
  {
    name: "Network Intelligence",
    toUrl: (projectId) => `https://console.cloud.google.com/net-intelligence?project=${projectId}`,
  },
  {
    name: "Network Security",
    toUrl: (projectId) => `https://console.cloud.google.com/net-security?project=${projectId}`,
  },
  {
    name: "Network Service Tiers",
    toUrl: (projectId) => `https://console.cloud.google.com/net-tier?project=${projectId}`,
  },
  { name: "BigQuery", toUrl: (projectId) => `https://console.cloud.google.com/bigquery?project=${projectId}` },
  { name: "Pub/Sub", toUrl: (projectId) => `https://console.cloud.google.com/cloudpubsub?project=${projectId}` },
  { name: "Dataflow", toUrl: (projectId) => `https://console.cloud.google.com/dataflow?project=${projectId}` },
  { name: "Dataproc", toUrl: (projectId) => `https://console.cloud.google.com/dataproc?project=${projectId}` },
  { name: "Composer", toUrl: (projectId) => `https://console.cloud.google.com/composer?project=${projectId}` },
  { name: "Looker", toUrl: (projectId) => `https://console.cloud.google.com/looker?project=${projectId}` },
  { name: "Datastream", toUrl: (projectId) => `https://console.cloud.google.com/datastream?project=${projectId}` },
  { name: "Data Fusion", toUrl: (projectId) => `https://console.cloud.google.com/data-fusion?project=${projectId}` },
  { name: "IoT Core", toUrl: (projectId) => `https://console.cloud.google.com/iot?project=${projectId}` },
  { name: "Dataprep", toUrl: (projectId) => `https://console.cloud.google.com/dataprep?project=${projectId}` },
  {
    name: "Financial Services",
    toUrl: (projectId) => `https://console.cloud.google.com/financial_services?project=${projectId}`,
  },
  { name: "Healthcare", toUrl: (projectId) => `https://console.cloud.google.com/healthcare?project=${projectId}` },
  { name: "Life Sciences", toUrl: (projectId) => `https://console.cloud.google.com/lifesciences?project=${projectId}` },
  { name: "Data Catalog", toUrl: (projectId) => `https://console.cloud.google.com/datacatalog?project=${projectId}` },
  {
    name: "Elastic Cloud",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/elastic-prod/elastic-cloud?project=${projectId}`,
  },
  {
    name: "DataStax Astra",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/datastax-public/datastax-astra-dbaas?project=${projectId}`,
  },
  {
    name: "Databricks",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/databricks-prod/databricks?project=${projectId}`,
  },
  { name: "SQL", toUrl: (projectId) => `https://console.cloud.google.com/sql?project=${projectId}` },
  { name: "Bigtable", toUrl: (projectId) => `https://console.cloud.google.com/bigtable?project=${projectId}` },
  { name: "Datastore", toUrl: (projectId) => `https://console.cloud.google.com/datastore?project=${projectId}` },
  { name: "Firestore", toUrl: (projectId) => `https://console.cloud.google.com/firestore?project=${projectId}` },
  { name: "Memorystore", toUrl: (projectId) => `https://console.cloud.google.com/memorystore?project=${projectId}` },
  { name: "Spanner", toUrl: (projectId) => `https://console.cloud.google.com/spanner?project=${projectId}` },
  {
    name: "Database Migration",
    toUrl: (projectId) => `https://console.cloud.google.com/dbmigration?project=${projectId}`,
  },
  {
    name: "MongoDB Atlas",
    toUrl: (projectId) => `https://console.cloud.google.com/marketplace/product/mongodb/atlas-pro?project=${projectId}`,
  },
  {
    name: "Neo4j Aura Professional Database-as-a-Service",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/endpoints/prod.n4gcp.neo4j.io?project=${projectId}`,
  },
  {
    name: "Redis Enterprise",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/endpoints/gcp.redisenterprise.com?project=${projectId}`,
  },
  { name: "Cloud Run", toUrl: (projectId) => `https://console.cloud.google.com/run?project=${projectId}` },
  { name: "Cloud Functions", toUrl: (projectId) => `https://console.cloud.google.com/functions?project=${projectId}` },
  { name: "App Engine", toUrl: (projectId) => `https://console.cloud.google.com/appengine?project=${projectId}` },
  { name: "Security", toUrl: (projectId) => `https://console.cloud.google.com/security?project=${projectId}` },
  { name: "Compliance", toUrl: (projectId) => `https://console.cloud.google.com/compliance?project=${projectId}` },
  { name: "Container Registry", toUrl: (projectId) => `https://console.cloud.google.com/gcr?project=${projectId}` },
  { name: "Cloud Build", toUrl: (projectId) => `https://console.cloud.google.com/cloud-build?project=${projectId}` },
  {
    name: "Artifact Registry",
    toUrl: (projectId) => `https://console.cloud.google.com/artifacts?project=${projectId}`,
  },
  { name: "Source Repositories", toUrl: (projectId) => `https://console.cloud.google.com/code?project=${projectId}` },
  { name: "Cloud Deploy", toUrl: (projectId) => `https://console.cloud.google.com/deploy?project=${projectId}` },
  {
    name: "Cloud Scheduler",
    toUrl: (projectId) => `https://console.cloud.google.com/cloudscheduler?project=${projectId}`,
  },
  { name: "API Gateway", toUrl: (projectId) => `https://console.cloud.google.com/api-gateway?project=${projectId}` },
  { name: "Workflows", toUrl: (projectId) => `https://console.cloud.google.com/workflows?project=${projectId}` },
  { name: "Cloud Tasks", toUrl: (projectId) => `https://console.cloud.google.com/cloudtasks?project=${projectId}` },
  { name: "Eventarc", toUrl: (projectId) => `https://console.cloud.google.com/eventarc?project=${projectId}` },
  { name: "AI Platform", toUrl: (projectId) => `https://console.cloud.google.com/ai-platform?project=${projectId}` },
  { name: "Vertex AI", toUrl: (projectId) => `https://console.cloud.google.com/vertex-ai?project=${projectId}` },
  { name: "Tables", toUrl: (projectId) => `https://console.cloud.google.com/automl-tables?project=${projectId}` },
  { name: "Vision", toUrl: (projectId) => `https://console.cloud.google.com/vision?project=${projectId}` },
  {
    name: "Recommendations AI",
    toUrl: (projectId) => `https://console.cloud.google.com/recommendation?project=${projectId}`,
  },
  {
    name: "Natural Language",
    toUrl: (projectId) => `https://console.cloud.google.com/natural-language?project=${projectId}`,
  },
  {
    name: "Data Labeling",
    toUrl: (projectId) => `https://console.cloud.google.com/data-labeling?project=${projectId}`,
  },
  { name: "Retail", toUrl: (projectId) => `https://console.cloud.google.com/ai/retail?project=${projectId}` },
  {
    name: "Video Intelligence",
    toUrl: (projectId) => `https://console.cloud.google.com/video-intelligence?project=${projectId}`,
  },
  { name: "Speech-to-Text", toUrl: (projectId) => `https://console.cloud.google.com/speech?project=${projectId}` },
  { name: "Translation", toUrl: (projectId) => `https://console.cloud.google.com/translation?project=${projectId}` },
  { name: "Document AI", toUrl: (projectId) => `https://console.cloud.google.com/ai/document-ai?project=${projectId}` },
  {
    name: "Talent Solution",
    toUrl: (projectId) => `https://console.cloud.google.com/talent-solution?project=${projectId}`,
  },
  { name: "Endpoints", toUrl: (projectId) => `https://console.cloud.google.com/endpoints?project=${projectId}` },
  { name: "Deployment Manager", toUrl: (projectId) => `https://console.cloud.google.com/dm?project=${projectId}` },
  {
    name: "Identity Platform",
    toUrl: (projectId) => `https://console.cloud.google.com/customer-identity?project=${projectId}`,
  },
  { name: "Apigee", toUrl: (projectId) => `https://console.cloud.google.com/apigee?project=${projectId}` },
  { name: "Private Catalog", toUrl: (projectId) => `https://console.cloud.google.com/catalog?project=${projectId}` },
  { name: "Carbon Footprint", toUrl: (projectId) => `https://console.cloud.google.com/carbon?project=${projectId}` },
  {
    name: "Apache Kafka on Confluent",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/confluent-prod/apache-kafka-on-confluent-cloud?project=${projectId}`,
  },
  {
    name: "Splunk Cloud",
    toUrl: (projectId) =>
      `https://console.cloud.google.com/marketplace/product/gcp-marketplace-lve-1/splunk-cloud?project=${projectId}`,
  },
  {
    name: "Google Maps Platform",
    toUrl: (projectId) => `https://console.cloud.google.com/google/maps-apis?project=${projectId}`,
  },
  { name: "Game Servers", toUrl: (projectId) => `https://console.cloud.google.com/game?project=${projectId}` },
  { name: "Support", toUrl: (projectId) => `https://console.cloud.google.com/support?project=${projectId}` },
];
