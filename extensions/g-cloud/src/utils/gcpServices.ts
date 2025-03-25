/**
 * Predefined Google Cloud Services information
 * This file contains information about GCP services and APIs to avoid
 * unnecessary API calls when displaying service information.
 */

export interface GCPServiceInfo {
  name: string;
  displayName: string;
  description: string;
  category: GCPServiceCategory;
  documentation?: string;
  console?: string;
  dependsOn?: string[];
  region?: string;
}

/**
 * Categories of Google Cloud services
 */
export enum GCPServiceCategory {
  COMPUTE = "Compute",
  STORAGE = "Storage",
  DATABASE = "Database",
  NETWORKING = "Networking",
  SECURITY = "Security",
  ANALYTICS = "Analytics",
  AI_ML = "AI & ML",
  DEVOPS = "DevOps",
  MANAGEMENT = "Management",
  SERVERLESS = "Serverless",
  CONTAINERS = "Containers",
  MIGRATION = "Migration",
  IOT = "IoT",
  MEDIA = "Media",
  HEALTHCARE = "Healthcare",
  FINANCIAL = "Financial",
  OTHER = "Other",
}

/**
 * Predefined Google Cloud services
 */
export const predefinedServices: Record<string, GCPServiceInfo> = {
  // Compute services
  "compute.googleapis.com": {
    name: "compute.googleapis.com",
    displayName: "Compute Engine",
    description: "Create and run virtual machines on Google infrastructure.",
    category: GCPServiceCategory.COMPUTE,
    documentation: "https://cloud.google.com/compute/docs",
    console: "https://console.cloud.google.com/compute",
  },
  "appengine.googleapis.com": {
    name: "appengine.googleapis.com",
    displayName: "App Engine",
    description: "Build highly scalable applications on a fully managed serverless platform.",
    category: GCPServiceCategory.COMPUTE,
    documentation: "https://cloud.google.com/appengine/docs",
    console: "https://console.cloud.google.com/appengine",
  },
  "container.googleapis.com": {
    name: "container.googleapis.com",
    displayName: "Google Kubernetes Engine",
    description: "Secured and managed Kubernetes service with four-way auto-scaling and multi-cluster support.",
    category: GCPServiceCategory.CONTAINERS,
    documentation: "https://cloud.google.com/kubernetes-engine/docs",
    console: "https://console.cloud.google.com/kubernetes",
  },

  // Serverless services
  "run.googleapis.com": {
    name: "run.googleapis.com",
    displayName: "Cloud Run",
    description:
      "Fully managed compute platform for deploying and scaling containerized applications quickly and securely.",
    category: GCPServiceCategory.SERVERLESS,
    documentation: "https://cloud.google.com/run/docs",
    console: "https://console.cloud.google.com/run",
  },
  "cloudfunctions.googleapis.com": {
    name: "cloudfunctions.googleapis.com",
    displayName: "Cloud Functions",
    description: "Event-driven serverless compute platform for cloud services and HTTP requests.",
    category: GCPServiceCategory.SERVERLESS,
    documentation: "https://cloud.google.com/functions/docs",
    console: "https://console.cloud.google.com/functions",
  },
  "cloudscheduler.googleapis.com": {
    name: "cloudscheduler.googleapis.com",
    displayName: "Cloud Scheduler",
    description: "Fully managed enterprise-grade cron job scheduler.",
    category: GCPServiceCategory.SERVERLESS,
    documentation: "https://cloud.google.com/scheduler/docs",
    console: "https://console.cloud.google.com/cloudscheduler",
  },
  "eventarc.googleapis.com": {
    name: "eventarc.googleapis.com",
    displayName: "Eventarc",
    description:
      "Asynchronous messaging service that uses events to trigger and deliver event data to serverless services.",
    category: GCPServiceCategory.SERVERLESS,
    documentation: "https://cloud.google.com/eventarc/docs",
    console: "https://console.cloud.google.com/eventarc",
  },
  "workflows.googleapis.com": {
    name: "workflows.googleapis.com",
    displayName: "Workflows",
    description: "Orchestrate and automate Google Cloud and HTTP-based API services with serverless workflows.",
    category: GCPServiceCategory.SERVERLESS,
    documentation: "https://cloud.google.com/workflows/docs",
    console: "https://console.cloud.google.com/workflows",
  },

  // Storage services
  "storage.googleapis.com": {
    name: "storage.googleapis.com",
    displayName: "Cloud Storage",
    description:
      "Object storage for companies of all sizes. Store any amount of data and retrieve it as often as you'd like.",
    category: GCPServiceCategory.STORAGE,
    documentation: "https://cloud.google.com/storage/docs",
    console: "https://console.cloud.google.com/storage",
  },
  "firestore.googleapis.com": {
    name: "firestore.googleapis.com",
    displayName: "Firestore",
    description:
      "Flexible, scalable NoSQL cloud database to store and sync data for client- and server-side development.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/firestore/docs",
    console: "https://console.cloud.google.com/firestore",
  },
  "bigtable.googleapis.com": {
    name: "bigtable.googleapis.com",
    displayName: "Bigtable",
    description: "Fully managed, scalable NoSQL database service for large analytical and operational workloads.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/bigtable/docs",
    console: "https://console.cloud.google.com/bigtable",
  },
  "spanner.googleapis.com": {
    name: "spanner.googleapis.com",
    displayName: "Cloud Spanner",
    description:
      "Fully managed relational database with unlimited scale, strong consistency, and up to 99.999% availability.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/spanner/docs",
    console: "https://console.cloud.google.com/spanner",
  },
  "datastore.googleapis.com": {
    name: "datastore.googleapis.com",
    displayName: "Datastore",
    description: "Highly-scalable NoSQL database for your applications.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/datastore/docs",
    console: "https://console.cloud.google.com/datastore",
  },
  "file.googleapis.com": {
    name: "file.googleapis.com",
    displayName: "Filestore",
    description:
      "Fully managed file storage service for applications running on Compute Engine VM instances or GKE clusters.",
    category: GCPServiceCategory.STORAGE,
    documentation: "https://cloud.google.com/filestore/docs",
    console: "https://console.cloud.google.com/filestore",
  },

  // Database services
  "sqladmin.googleapis.com": {
    name: "sqladmin.googleapis.com",
    displayName: "Cloud SQL",
    description: "Fully managed relational database service for MySQL, PostgreSQL, and SQL Server.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/sql/docs",
    console: "https://console.cloud.google.com/sql",
  },
  "redis.googleapis.com": {
    name: "redis.googleapis.com",
    displayName: "Memorystore for Redis",
    description: "Fully managed Redis service for Google Cloud.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/memorystore/docs/redis",
    console: "https://console.cloud.google.com/memorystore/redis",
  },
  "memcache.googleapis.com": {
    name: "memcache.googleapis.com",
    displayName: "Memorystore for Memcached",
    description: "Fully managed Memcached service for Google Cloud.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/memorystore/docs/memcached",
    console: "https://console.cloud.google.com/memorystore/memcached",
  },
  "mongodb.googleapis.com": {
    name: "mongodb.googleapis.com",
    displayName: "MongoDB Atlas",
    description: "Fully managed MongoDB service on Google Cloud.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/mongodb",
    console: "https://console.cloud.google.com/marketplace/product/mongodb/atlas-pro",
  },
  "alloydb.googleapis.com": {
    name: "alloydb.googleapis.com",
    displayName: "AlloyDB for PostgreSQL",
    description: "Fully managed PostgreSQL-compatible database service for demanding enterprise workloads.",
    category: GCPServiceCategory.DATABASE,
    documentation: "https://cloud.google.com/alloydb/docs",
    console: "https://console.cloud.google.com/alloydb",
  },

  // Networking services
  "dns.googleapis.com": {
    name: "dns.googleapis.com",
    displayName: "Cloud DNS",
    description: "Publish and manage your DNS records using Google's infrastructure.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/dns/docs",
    console: "https://console.cloud.google.com/net-services/dns",
  },
  "networkservices.googleapis.com": {
    name: "networkservices.googleapis.com",
    displayName: "Network Services",
    description: "Network services for Google Cloud resources.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/vpc/docs",
    console: "https://console.cloud.google.com/networking",
  },
  "networksecurity.googleapis.com": {
    name: "networksecurity.googleapis.com",
    displayName: "Network Security",
    description: "Security services for Google Cloud networking.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/vpc/docs/firewall-policies",
    console: "https://console.cloud.google.com/networking/firewalls",
  },
  "vpcaccess.googleapis.com": {
    name: "vpcaccess.googleapis.com",
    displayName: "VPC Access",
    description: "Connect serverless environments to your VPC network.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/vpc/docs/serverless-vpc-access",
    console: "https://console.cloud.google.com/networking/connectors",
  },
  "cloudloadbalancing.googleapis.com": {
    name: "cloudloadbalancing.googleapis.com",
    displayName: "Cloud Load Balancing",
    description: "High-performance, scalable load balancing on Google Cloud.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/load-balancing/docs",
    console: "https://console.cloud.google.com/net-services/loadbalancing",
  },
  "cdn.googleapis.com": {
    name: "cdn.googleapis.com",
    displayName: "Cloud CDN",
    description: "Content delivery network for delivering web and video content.",
    category: GCPServiceCategory.NETWORKING,
    documentation: "https://cloud.google.com/cdn/docs",
    console: "https://console.cloud.google.com/net-services/cdn",
  },

  // Security services
  "iam.googleapis.com": {
    name: "iam.googleapis.com",
    displayName: "Identity and Access Management (IAM)",
    description: "Fine-grained access control and visibility for centrally managing cloud resources.",
    category: GCPServiceCategory.SECURITY,
    documentation: "https://cloud.google.com/iam/docs",
    console: "https://console.cloud.google.com/iam-admin",
  },
  "cloudkms.googleapis.com": {
    name: "cloudkms.googleapis.com",
    displayName: "Cloud Key Management Service",
    description: "Manage encryption keys on Google Cloud.",
    category: GCPServiceCategory.SECURITY,
    documentation: "https://cloud.google.com/kms/docs",
    console: "https://console.cloud.google.com/security/kms",
  },
  "secretmanager.googleapis.com": {
    name: "secretmanager.googleapis.com",
    displayName: "Secret Manager",
    description: "Store API keys, passwords, certificates, and other sensitive data.",
    category: GCPServiceCategory.SECURITY,
    documentation: "https://cloud.google.com/secret-manager/docs",
    console: "https://console.cloud.google.com/security/secret-manager",
  },
  "cloudasset.googleapis.com": {
    name: "cloudasset.googleapis.com",
    displayName: "Cloud Asset Inventory",
    description: "View, monitor, and analyze all your Google Cloud and Anthos assets across projects and services.",
    category: GCPServiceCategory.SECURITY,
    documentation: "https://cloud.google.com/asset-inventory/docs",
    console: "https://console.cloud.google.com/asset-inventory",
  },
  "securitycenter.googleapis.com": {
    name: "securitycenter.googleapis.com",
    displayName: "Security Command Center",
    description: "Centralized vulnerability and threat reporting service for Google Cloud resources.",
    category: GCPServiceCategory.SECURITY,
    documentation: "https://cloud.google.com/security-command-center/docs",
    console: "https://console.cloud.google.com/security/command-center",
  },

  // Analytics services
  "bigquery.googleapis.com": {
    name: "bigquery.googleapis.com",
    displayName: "BigQuery",
    description: "Serverless, highly scalable, and cost-effective multi-cloud data warehouse.",
    category: GCPServiceCategory.ANALYTICS,
    documentation: "https://cloud.google.com/bigquery/docs",
    console: "https://console.cloud.google.com/bigquery",
  },
  "dataflow.googleapis.com": {
    name: "dataflow.googleapis.com",
    displayName: "Dataflow",
    description: "Unified stream and batch data processing that's serverless, fast, and cost-effective.",
    category: GCPServiceCategory.ANALYTICS,
    documentation: "https://cloud.google.com/dataflow/docs",
    console: "https://console.cloud.google.com/dataflow",
  },
  "dataproc.googleapis.com": {
    name: "dataproc.googleapis.com",
    displayName: "Dataproc",
    description:
      "Fully managed and highly scalable service for running Apache Spark, Apache Flink, Presto, and 30+ open source tools and frameworks.",
    category: GCPServiceCategory.ANALYTICS,
    documentation: "https://cloud.google.com/dataproc/docs",
    console: "https://console.cloud.google.com/dataproc",
  },
  "pubsub.googleapis.com": {
    name: "pubsub.googleapis.com",
    displayName: "Pub/Sub",
    description: "Messaging and ingestion for event-driven systems and streaming analytics.",
    category: GCPServiceCategory.ANALYTICS,
    documentation: "https://cloud.google.com/pubsub/docs",
    console: "https://console.cloud.google.com/cloudpubsub",
  },
  "datacatalog.googleapis.com": {
    name: "datacatalog.googleapis.com",
    displayName: "Data Catalog",
    description: "Fully managed and scalable metadata management service.",
    category: GCPServiceCategory.ANALYTICS,
    documentation: "https://cloud.google.com/data-catalog/docs",
    console: "https://console.cloud.google.com/datacatalog",
  },

  // AI & ML services
  "ml.googleapis.com": {
    name: "ml.googleapis.com",
    displayName: "AI Platform",
    description: "Build and run machine learning applications.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/ai-platform/docs",
    console: "https://console.cloud.google.com/ai-platform",
  },
  "aiplatform.googleapis.com": {
    name: "aiplatform.googleapis.com",
    displayName: "Vertex AI",
    description: "Unified platform for machine learning development and deployment.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/vertex-ai/docs",
    console: "https://console.cloud.google.com/vertex-ai",
  },
  "speech.googleapis.com": {
    name: "speech.googleapis.com",
    displayName: "Speech-to-Text",
    description: "Convert audio to text with speech recognition powered by machine learning.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/speech-to-text/docs",
    console: "https://console.cloud.google.com/speech",
  },
  "vision.googleapis.com": {
    name: "vision.googleapis.com",
    displayName: "Vision AI",
    description: "Derive insights from images with machine learning.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/vision/docs",
    console: "https://console.cloud.google.com/vision",
  },
  "translate.googleapis.com": {
    name: "translate.googleapis.com",
    displayName: "Translation AI",
    description:
      "Dynamically translate between languages using Google's pre-trained or custom machine learning models.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/translate/docs",
    console: "https://console.cloud.google.com/translation",
  },
  "dialogflow.googleapis.com": {
    name: "dialogflow.googleapis.com",
    displayName: "Dialogflow",
    description:
      "Build conversational interfaces for websites, mobile applications, popular messaging platforms, and IoT devices.",
    category: GCPServiceCategory.AI_ML,
    documentation: "https://cloud.google.com/dialogflow/docs",
    console: "https://console.cloud.google.com/dialogflow",
  },

  // DevOps services
  "cloudbuild.googleapis.com": {
    name: "cloudbuild.googleapis.com",
    displayName: "Cloud Build",
    description: "Build, test, and deploy on Google Cloud's serverless CI/CD platform.",
    category: GCPServiceCategory.DEVOPS,
    documentation: "https://cloud.google.com/build/docs",
    console: "https://console.cloud.google.com/cloud-build",
  },
  "containerregistry.googleapis.com": {
    name: "containerregistry.googleapis.com",
    displayName: "Container Registry",
    description: "Store, manage, and secure your Docker container images.",
    category: GCPServiceCategory.DEVOPS,
    documentation: "https://cloud.google.com/container-registry/docs",
    console: "https://console.cloud.google.com/gcr",
  },
  "artifactregistry.googleapis.com": {
    name: "artifactregistry.googleapis.com",
    displayName: "Artifact Registry",
    description: "Universal package manager for build artifacts and dependencies.",
    category: GCPServiceCategory.DEVOPS,
    documentation: "https://cloud.google.com/artifact-registry/docs",
    console: "https://console.cloud.google.com/artifacts",
  },
  "sourcerepo.googleapis.com": {
    name: "sourcerepo.googleapis.com",
    displayName: "Cloud Source Repositories",
    description: "Git repositories hosted on Google Cloud.",
    category: GCPServiceCategory.DEVOPS,
    documentation: "https://cloud.google.com/source-repositories/docs",
    console: "https://console.cloud.google.com/cloud-source-repositories",
  },
  "clouddeploy.googleapis.com": {
    name: "clouddeploy.googleapis.com",
    displayName: "Cloud Deploy",
    description: "Fully managed continuous delivery service to promote code across environments.",
    category: GCPServiceCategory.DEVOPS,
    documentation: "https://cloud.google.com/deploy/docs",
    console: "https://console.cloud.google.com/deploy",
  },

  // Management services
  "cloudresourcemanager.googleapis.com": {
    name: "cloudresourcemanager.googleapis.com",
    displayName: "Cloud Resource Manager",
    description: "Hierarchically manage resources by project, folder, and organization.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/resource-manager/docs",
    console: "https://console.cloud.google.com/cloud-resource-manager",
  },
  "monitoring.googleapis.com": {
    name: "monitoring.googleapis.com",
    displayName: "Cloud Monitoring",
    description:
      "Gain visibility into the performance, availability, and health of your applications and infrastructure.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/monitoring/docs",
    console: "https://console.cloud.google.com/monitoring",
  },
  "logging.googleapis.com": {
    name: "logging.googleapis.com",
    displayName: "Cloud Logging",
    description: "Store, search, analyze, monitor, and alert on log data and events.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/logging/docs",
    console: "https://console.cloud.google.com/logs",
  },
  "cloudtrace.googleapis.com": {
    name: "cloudtrace.googleapis.com",
    displayName: "Cloud Trace",
    description: "Find performance bottlenecks in production applications.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/trace/docs",
    console: "https://console.cloud.google.com/traces",
  },
  "clouderrorreporting.googleapis.com": {
    name: "clouderrorreporting.googleapis.com",
    displayName: "Error Reporting",
    description: "Identifies and helps you understand application errors.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/error-reporting/docs",
    console: "https://console.cloud.google.com/errors",
  },
  "serviceusage.googleapis.com": {
    name: "serviceusage.googleapis.com",
    displayName: "Service Usage",
    description: "Enables services on Google Cloud projects.",
    category: GCPServiceCategory.MANAGEMENT,
    documentation: "https://cloud.google.com/service-usage/docs",
    console: "https://console.cloud.google.com/apis/dashboard",
  },
};

/**
 * Get information about a GCP service
 * @param serviceName The full service name (e.g., "compute.googleapis.com")
 * @returns Service information or a default formatted name if not found
 */
export function getServiceInfo(serviceName: string): GCPServiceInfo {
  // Check if it's a predefined service
  if (predefinedServices[serviceName]) {
    return predefinedServices[serviceName];
  }

  // If not found, format the name nicely
  return {
    name: serviceName,
    displayName: formatServiceName(serviceName),
    description: "",
    category: GCPServiceCategory.OTHER,
  };
}

/**
 * Format a service name to be more readable
 * @param serviceName The service name (e.g., "compute.googleapis.com")
 * @returns Formatted service name (e.g., "Compute")
 */
export function formatServiceName(serviceName: string): string {
  // Remove the ".googleapis.com" suffix if present
  const baseName = serviceName.replace(/\.googleapis\.com$/, "");

  // Split by dots and capitalize each part
  return baseName
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Get all services in a specific category
 * @param category The category to filter by
 * @returns Array of services in the specified category, or empty array if category is invalid
 */
export function getServicesByCategory(category: GCPServiceCategory): GCPServiceInfo[] {
  // Verify the category exists in the enum
  if (!Object.values(GCPServiceCategory).includes(category)) {
    console.warn(`Invalid service category: ${category}`);
    return [];
  }

  return Object.values(predefinedServices).filter((service) => service.category === category);
}

/**
 * Get all available service categories
 * @returns Array of all service categories
 */
export function getAllCategories(): GCPServiceCategory[] {
  return Object.values(GCPServiceCategory);
}

/**
 * Get all services
 * @returns Array of all services
 */
export function getAllServices(): GCPServiceInfo[] {
  return Object.values(predefinedServices);
}
