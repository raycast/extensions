export interface IAMRoleInfo {
  title: string;
  description: string;
  service: string;
}

export const predefinedRoles: Record<string, IAMRoleInfo> = {
  "roles/storage.admin": {
    title: "Storage Admin",
    description: "Full control of GCS resources.",
    service: "Storage",
  },
  "roles/storage.objectAdmin": {
    title: "Storage Object Admin",
    description: "Grants full control over objects, including listing, creating, viewing, and deleting objects.",
    service: "Storage",
  },
  "roles/storage.objectCreator": {
    title: "Storage Object Creator",
    description: "Allows creating objects but not viewing, deleting or replacing them.",
    service: "Storage",
  },
  "roles/storage.objectViewer": {
    title: "Storage Object Viewer",
    description: "Read access to objects without the ability to modify or delete them.",
    service: "Storage",
  },
  "roles/storage.legacyBucketOwner": {
    title: "Storage Legacy Bucket Owner",
    description: "Grants full control over buckets with object listing/creation/deletion.",
    service: "Storage",
  },
  "roles/storage.legacyBucketReader": {
    title: "Storage Legacy Bucket Reader",
    description: "Grants read access to bucket metadata (not object metadata).",
    service: "Storage",
  },
  "roles/storage.legacyBucketWriter": {
    title: "Storage Legacy Bucket Writer",
    description: "Grants read and write access to bucket metadata (not object metadata).",
    service: "Storage",
  },
  "roles/storage.legacyObjectOwner": {
    title: "Storage Legacy Object Owner",
    description:
      "Grants full control over objects, including the ability to read and write objects and their metadata.",
    service: "Storage",
  },
  "roles/storage.legacyObjectReader": {
    title: "Storage Legacy Object Reader",
    description: "Grants the ability to read objects and their metadata, excluding ACLs.",
    service: "Storage",
  },

  "roles/compute.admin": {
    title: "Compute Admin",
    description: "Full control of all Compute Engine resources.",
    service: "Compute Engine",
  },
  "roles/compute.instanceAdmin": {
    title: "Compute Instance Admin",
    description: "Full control of Compute Engine instances, instance groups, disks, snapshots, and images.",
    service: "Compute Engine",
  },
  "roles/compute.networkAdmin": {
    title: "Compute Network Admin",
    description: "Full control of Compute Engine networking resources.",
    service: "Compute Engine",
  },
  "roles/compute.viewer": {
    title: "Compute Viewer",
    description:
      "Read-only access to get and list Compute Engine resources, without the ability to read data from the resources.",
    service: "Compute Engine",
  },

  "roles/iam.serviceAccountAdmin": {
    title: "Service Account Admin",
    description: "Create and manage service accounts.",
    service: "IAM",
  },
  "roles/iam.serviceAccountUser": {
    title: "Service Account User",
    description: "Run operations as the service account.",
    service: "IAM",
  },
  "roles/iam.roleAdmin": {
    title: "Role Administrator",
    description: "Ability to create, update, and delete custom roles.",
    service: "IAM",
  },

  "roles/owner": {
    title: "Owner",
    description: "Full access to all resources.",
    service: "Project",
  },
  "roles/editor": {
    title: "Editor",
    description: "Edit access to all resources.",
    service: "Project",
  },
  "roles/viewer": {
    title: "Viewer",
    description: "View access to all resources.",
    service: "Project",
  },

  "roles/bigquery.admin": {
    title: "BigQuery Admin",
    description: "Full access to BigQuery resources and data.",
    service: "BigQuery",
  },
  "roles/bigquery.dataEditor": {
    title: "BigQuery Data Editor",
    description: "Read/write access to data, but not to tables.",
    service: "BigQuery",
  },
  "roles/bigquery.dataViewer": {
    title: "BigQuery Data Viewer",
    description: "Read-only access to data.",
    service: "BigQuery",
  },

  "roles/run.admin": {
    title: "Cloud Run Admin",
    description: "Full access to Cloud Run resources.",
    service: "Cloud Run",
  },
  "roles/run.invoker": {
    title: "Cloud Run Invoker",
    description: "Ability to invoke Cloud Run services.",
    service: "Cloud Run",
  },

  "roles/container.admin": {
    title: "Kubernetes Engine Admin",
    description: "Full access to Kubernetes Engine resources.",
    service: "Kubernetes Engine",
  },
  "roles/container.developer": {
    title: "Kubernetes Engine Developer",
    description: "Access to create and manage workloads and services.",
    service: "Kubernetes Engine",
  },
  "roles/container.viewer": {
    title: "Kubernetes Engine Viewer",
    description: "Read-only access to Kubernetes Engine resources.",
    service: "Kubernetes Engine",
  },

  "roles/pubsub.admin": {
    title: "Pub/Sub Admin",
    description: "Full access to Pub/Sub resources.",
    service: "Pub/Sub",
  },
  "roles/pubsub.publisher": {
    title: "Pub/Sub Publisher",
    description: "Ability to publish messages to topics.",
    service: "Pub/Sub",
  },
  "roles/pubsub.subscriber": {
    title: "Pub/Sub Subscriber",
    description: "Ability to subscribe to topics and receive messages.",
    service: "Pub/Sub",
  },

  "roles/cloudfunctions.admin": {
    title: "Cloud Functions Admin",
    description: "Full access to Cloud Functions resources.",
    service: "Cloud Functions",
  },
  "roles/cloudfunctions.developer": {
    title: "Cloud Functions Developer",
    description: "Ability to create, update, and delete functions.",
    service: "Cloud Functions",
  },
  "roles/cloudfunctions.invoker": {
    title: "Cloud Functions Invoker",
    description: "Ability to invoke Cloud Functions.",
    service: "Cloud Functions",
  },

  "roles/datastore.owner": {
    title: "Datastore Owner",
    description: "Full access to Datastore resources.",
    service: "Datastore",
  },
  "roles/datastore.user": {
    title: "Datastore User",
    description: "Ability to create, update, and delete entities.",
    service: "Datastore",
  },
  "roles/datastore.viewer": {
    title: "Datastore Viewer",
    description: "Read-only access to Datastore resources.",
    service: "Datastore",
  },

  "roles/logging.admin": {
    title: "Logging Admin",
    description: "Full access to logs and logging configurations.",
    service: "Logging",
  },
  "roles/logging.viewer": {
    title: "Logs Viewer",
    description: "Read-only access to logs.",
    service: "Logging",
  },

  "roles/monitoring.admin": {
    title: "Monitoring Admin",
    description: "Full access to monitoring resources.",
    service: "Monitoring",
  },
  "roles/monitoring.viewer": {
    title: "Monitoring Viewer",
    description: "Read-only access to monitoring resources.",
    service: "Monitoring",
  },

  "roles/cloudsql.admin": {
    title: "Cloud SQL Admin",
    description: "Full control of Cloud SQL resources.",
    service: "Cloud SQL",
  },
  "roles/cloudsql.editor": {
    title: "Cloud SQL Editor",
    description: "Edit access to Cloud SQL instances, but not user management.",
    service: "Cloud SQL",
  },
  "roles/cloudsql.viewer": {
    title: "Cloud SQL Viewer",
    description: "Read-only access to Cloud SQL resources.",
    service: "Cloud SQL",
  },
  "roles/cloudsql.client": {
    title: "Cloud SQL Client",
    description: "Connect to Cloud SQL instances as a client.",
    service: "Cloud SQL",
  },

  "roles/appengine.appAdmin": {
    title: "App Engine Admin",
    description: "Full control over App Engine applications.",
    service: "App Engine",
  },
  "roles/appengine.deployer": {
    title: "App Engine Deployer",
    description: "Ability to deploy App Engine applications.",
    service: "App Engine",
  },
  "roles/appengine.appViewer": {
    title: "App Engine Viewer",
    description: "Read-only access to App Engine applications.",
    service: "App Engine",
  },
  "roles/appengine.serviceAdmin": {
    title: "App Engine Service Admin",
    description: "Manage App Engine services, but not deploy.",
    service: "App Engine",
  },

  "roles/spanner.admin": {
    title: "Cloud Spanner Admin",
    description: "Full control over Cloud Spanner resources.",
    service: "Cloud Spanner",
  },
  "roles/spanner.databaseAdmin": {
    title: "Cloud Spanner Database Admin",
    description: "Administer databases, but not instances.",
    service: "Cloud Spanner",
  },
  "roles/spanner.databaseReader": {
    title: "Cloud Spanner Database Reader",
    description: "Read-only access to Cloud Spanner databases.",
    service: "Cloud Spanner",
  },
  "roles/spanner.databaseUser": {
    title: "Cloud Spanner Database User",
    description: "Read/write access to data in Cloud Spanner databases.",
    service: "Cloud Spanner",
  },

  "roles/bigtable.admin": {
    title: "Bigtable Admin",
    description: "Full control over Bigtable resources.",
    service: "Bigtable",
  },
  "roles/bigtable.reader": {
    title: "Bigtable Reader",
    description: "Read-only access to Bigtable data.",
    service: "Bigtable",
  },
  "roles/bigtable.user": {
    title: "Bigtable User",
    description: "Read/write access to Bigtable data.",
    service: "Bigtable",
  },

  "roles/firestore.admin": {
    title: "Firestore Admin",
    description: "Full control over Firestore resources.",
    service: "Firestore",
  },
  "roles/firestore.dataUser": {
    title: "Firestore Data User",
    description: "Read/write access to Firestore data.",
    service: "Firestore",
  },
  "roles/firestore.dataViewer": {
    title: "Firestore Data Viewer",
    description: "Read-only access to Firestore data.",
    service: "Firestore",
  },

  "roles/servicenetworking.networksAdmin": {
    title: "Service Networking Admin",
    description: "Manage service networking connections.",
    service: "Service Networking",
  },

  "roles/cloudkms.admin": {
    title: "Cloud KMS Admin",
    description: "Full control over Cloud KMS resources.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.cryptoKeyEncrypter": {
    title: "Cloud KMS CryptoKey Encrypter",
    description: "Encrypt data using Cloud KMS keys.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.cryptoKeyDecrypter": {
    title: "Cloud KMS CryptoKey Decrypter",
    description: "Decrypt data using Cloud KMS keys.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.viewer": {
    title: "Cloud KMS Viewer",
    description: "View Cloud KMS resources.",
    service: "Cloud KMS",
  },

  "roles/secretmanager.admin": {
    title: "Secret Manager Admin",
    description: "Full control over Secret Manager resources.",
    service: "Secret Manager",
  },
  "roles/secretmanager.secretAccessor": {
    title: "Secret Manager Accessor",
    description: "Access Secret Manager secret values.",
    service: "Secret Manager",
  },
  "roles/secretmanager.viewer": {
    title: "Secret Manager Viewer",
    description: "View Secret Manager resources without accessing values.",
    service: "Secret Manager",
  },

  "roles/cloudbuild.builds.editor": {
    title: "Cloud Build Editor",
    description: "Create and manage Cloud Build resources.",
    service: "Cloud Build",
  },
  "roles/cloudbuild.builds.builder": {
    title: "Cloud Build Builder",
    description: "Run Cloud Build operations.",
    service: "Cloud Build",
  },
  "roles/cloudbuild.builds.viewer": {
    title: "Cloud Build Viewer",
    description: "View Cloud Build resources.",
    service: "Cloud Build",
  },

  "roles/artifactregistry.admin": {
    title: "Artifact Registry Admin",
    description: "Full control over Artifact Registry resources.",
    service: "Artifact Registry",
  },
  "roles/artifactregistry.reader": {
    title: "Artifact Registry Reader",
    description: "Read access to Artifact Registry repositories.",
    service: "Artifact Registry",
  },
  "roles/artifactregistry.writer": {
    title: "Artifact Registry Writer",
    description: "Write access to Artifact Registry repositories.",
    service: "Artifact Registry",
  },

  "roles/cloudscheduler.admin": {
    title: "Cloud Scheduler Admin",
    description: "Full control over Cloud Scheduler jobs.",
    service: "Cloud Scheduler",
  },
  "roles/cloudscheduler.viewer": {
    title: "Cloud Scheduler Viewer",
    description: "View Cloud Scheduler jobs.",
    service: "Cloud Scheduler",
  },

  "roles/cloudtasks.admin": {
    title: "Cloud Tasks Admin",
    description: "Full control over Cloud Tasks queues and tasks.",
    service: "Cloud Tasks",
  },
  "roles/cloudtasks.viewer": {
    title: "Cloud Tasks Viewer",
    description: "View Cloud Tasks queues and tasks.",
    service: "Cloud Tasks",
  },

  "roles/serviceusage.serviceUsageAdmin": {
    title: "Service Usage Admin",
    description: "Full control over service usage.",
    service: "Service Usage",
  },
  "roles/serviceusage.serviceUsageConsumer": {
    title: "Service Usage Consumer",
    description: "Use services that have been enabled.",
    service: "Service Usage",
  },
  "roles/serviceusage.serviceUsageViewer": {
    title: "Service Usage Viewer",
    description: "View service usage.",
    service: "Service Usage",
  },

  "roles/redis.admin": {
    title: "Cloud Memorystore Redis Admin",
    description: "Full control over Cloud Memorystore Redis instances.",
    service: "Cloud Memorystore",
  },
  "roles/redis.viewer": {
    title: "Cloud Memorystore Redis Viewer",
    description: "View Cloud Memorystore Redis instances.",
    service: "Cloud Memorystore",
  },

  "roles/dns.admin": {
    title: "DNS Administrator",
    description: "Full control over Cloud DNS resources.",
    service: "Cloud DNS",
  },
  "roles/dns.reader": {
    title: "DNS Reader",
    description: "Read-only access to Cloud DNS resources.",
    service: "Cloud DNS",
  },

  "roles/cdn.editor": {
    title: "Cloud CDN Editor",
    description: "Manage Cloud CDN configurations.",
    service: "Cloud CDN",
  },
  "roles/cdn.viewer": {
    title: "Cloud CDN Viewer",
    description: "View Cloud CDN configurations.",
    service: "Cloud CDN",
  },

  "roles/loadbalancing.admin": {
    title: "Load Balancing Admin",
    description: "Full control over load balancing resources.",
    service: "Load Balancing",
  },
  "roles/loadbalancing.viewer": {
    title: "Load Balancing Viewer",
    description: "View load balancing resources.",
    service: "Load Balancing",
  },

  "roles/compute.networkUser": {
    title: "Compute Network User",
    description: "Use Compute Engine networks.",
    service: "VPC Network",
  },
  "roles/compute.securityAdmin": {
    title: "Compute Security Admin",
    description: "Manage firewall rules and SSL certificates.",
    service: "VPC Network",
  },

  "roles/aiplatform.admin": {
    title: "AI Platform Admin",
    description: "Full control over AI Platform resources.",
    service: "AI Platform",
  },
  "roles/aiplatform.user": {
    title: "AI Platform User",
    description: "Use AI Platform resources.",
    service: "AI Platform",
  },
  "roles/aiplatform.viewer": {
    title: "AI Platform Viewer",
    description: "View AI Platform resources.",
    service: "AI Platform",
  },

  "roles/datafusion.admin": {
    title: "Data Fusion Admin",
    description: "Full control over Data Fusion instances.",
    service: "Data Fusion",
  },
  "roles/datafusion.runner": {
    title: "Data Fusion Runner",
    description: "Run Data Fusion pipelines.",
    service: "Data Fusion",
  },
  "roles/datafusion.viewer": {
    title: "Data Fusion Viewer",
    description: "View Data Fusion instances.",
    service: "Data Fusion",
  },

  "roles/composer.admin": {
    title: "Cloud Composer Admin",
    description: "Full control over Cloud Composer environments.",
    service: "Cloud Composer",
  },
  "roles/composer.worker": {
    title: "Cloud Composer Worker",
    description: "Run Cloud Composer workflows.",
    service: "Cloud Composer",
  },
  "roles/composer.user": {
    title: "Cloud Composer User",
    description: "Use Cloud Composer environments.",
    service: "Cloud Composer",
  },
  "roles/composer.environmentAndStorageObjectViewer": {
    title: "Cloud Composer Environment and Storage Object Viewer",
    description: "View Cloud Composer environments and storage objects.",
    service: "Cloud Composer",
  },

  "roles/dlp.admin": {
    title: "DLP Administrator",
    description: "Full control over DLP resources.",
    service: "Data Loss Prevention",
  },
  "roles/dlp.user": {
    title: "DLP User",
    description: "Use DLP resources.",
    service: "Data Loss Prevention",
  },
  "roles/dlp.reader": {
    title: "DLP Reader",
    description: "View DLP resources.",
    service: "Data Loss Prevention",
  },

  "roles/cloudiot.admin": {
    title: "Cloud IoT Admin",
    description: "Full control over Cloud IoT resources.",
    service: "Cloud IoT",
  },
  "roles/cloudiot.deviceController": {
    title: "Cloud IoT Device Controller",
    description: "Manage Cloud IoT devices.",
    service: "Cloud IoT",
  },
  "roles/cloudiot.viewer": {
    title: "Cloud IoT Viewer",
    description: "View Cloud IoT resources.",
    service: "Cloud IoT",
  },

  "roles/healthcare.datasetAdmin": {
    title: "Healthcare Dataset Administrator",
    description: "Full control over Healthcare datasets.",
    service: "Cloud Healthcare",
  },
  "roles/healthcare.fhirResourceReader": {
    title: "Healthcare FHIR Resource Reader",
    description: "Read access to FHIR resources.",
    service: "Cloud Healthcare",
  },
  "roles/healthcare.fhirResourceEditor": {
    title: "Healthcare FHIR Resource Editor",
    description: "Edit access to FHIR resources.",
    service: "Cloud Healthcare",
  },

  "roles/dataflow.admin": {
    title: "Dataflow Administrator",
    description: "Full control over Dataflow jobs.",
    service: "Dataflow",
  },
  "roles/dataflow.developer": {
    title: "Dataflow Developer",
    description: "Create and manage Dataflow jobs.",
    service: "Dataflow",
  },
  "roles/dataflow.viewer": {
    title: "Dataflow Viewer",
    description: "View Dataflow jobs.",
    service: "Dataflow",
  },

  "roles/dataproc.admin": {
    title: "Dataproc Administrator",
    description: "Full control over Dataproc resources.",
    service: "Dataproc",
  },
  "roles/dataproc.editor": {
    title: "Dataproc Editor",
    description: "Edit Dataproc resources.",
    service: "Dataproc",
  },
  "roles/dataproc.viewer": {
    title: "Dataproc Viewer",
    description: "View Dataproc resources.",
    service: "Dataproc",
  },

  "roles/lifesciences.admin": {
    title: "Cloud Life Sciences Admin",
    description: "Full control over Life Sciences resources.",
    service: "Life Sciences",
  },
  "roles/lifesciences.workflowsRunner": {
    title: "Cloud Life Sciences Workflows Runner",
    description: "Run Life Sciences workflows.",
    service: "Life Sciences",
  },
  "roles/lifesciences.viewer": {
    title: "Cloud Life Sciences Viewer",
    description: "View Life Sciences resources.",
    service: "Life Sciences",
  },

  "roles/file.editor": {
    title: "Cloud Filestore Editor",
    description: "Edit Filestore instances.",
    service: "Filestore",
  },
  "roles/file.viewer": {
    title: "Cloud Filestore Viewer",
    description: "View Filestore instances.",
    service: "Filestore",
  },

  "roles/nat.admin": {
    title: "Cloud NAT Admin",
    description: "Full control over Cloud NAT resources.",
    service: "Cloud NAT",
  },
  "roles/nat.viewer": {
    title: "Cloud NAT Viewer",
    description: "View Cloud NAT resources.",
    service: "Cloud NAT",
  },

  "roles/endpoints.admin": {
    title: "Cloud Endpoints Admin",
    description: "Full control over Cloud Endpoints resources.",
    service: "Cloud Endpoints",
  },
  "roles/endpoints.viewer": {
    title: "Cloud Endpoints Viewer",
    description: "View Cloud Endpoints resources.",
    service: "Cloud Endpoints",
  },

  "roles/servicedirectory.admin": {
    title: "Service Directory Admin",
    description: "Full control over Service Directory resources.",
    service: "Service Directory",
  },
  "roles/servicedirectory.editor": {
    title: "Service Directory Editor",
    description: "Edit Service Directory resources.",
    service: "Service Directory",
  },
  "roles/servicedirectory.viewer": {
    title: "Service Directory Viewer",
    description: "View Service Directory resources.",
    service: "Service Directory",
  },

  "roles/resourcemanager.organizationAdmin": {
    title: "Organization Administrator",
    description: "Full control of all resources in the organization.",
    service: "Organization",
  },
  "roles/resourcemanager.organizationViewer": {
    title: "Organization Viewer",
    description: "Get and list access to the organization and all resources within it.",
    service: "Organization",
  },
  "roles/resourcemanager.projectCreator": {
    title: "Project Creator",
    description: "Create new projects within the organization.",
    service: "Organization",
  },
  "roles/resourcemanager.projectDeleter": {
    title: "Project Deleter",
    description: "Delete projects within the organization.",
    service: "Organization",
  },
  "roles/resourcemanager.projectIamAdmin": {
    title: "Project IAM Admin",
    description: "Administer IAM policies on projects.",
    service: "Organization",
  },
  "roles/resourcemanager.folderAdmin": {
    title: "Folder Admin",
    description: "Full control of folders.",
    service: "Organization",
  },
  "roles/resourcemanager.folderCreator": {
    title: "Folder Creator",
    description: "Create folders within the organization.",
    service: "Organization",
  },
  "roles/resourcemanager.folderEditor": {
    title: "Folder Editor",
    description: "Edit folders and projects within folders.",
    service: "Organization",
  },
  "roles/resourcemanager.folderViewer": {
    title: "Folder Viewer",
    description: "View folders and projects within folders.",
    service: "Organization",
  },

  "roles/billing.admin": {
    title: "Billing Account Administrator",
    description: "Full control of billing accounts.",
    service: "Billing",
  },
  "roles/billing.creator": {
    title: "Billing Account Creator",
    description: "Create new billing accounts.",
    service: "Billing",
  },
  "roles/billing.user": {
    title: "Billing Account User",
    description: "Link projects to billing accounts.",
    service: "Billing",
  },
  "roles/billing.viewer": {
    title: "Billing Account Viewer",
    description: "View billing account information.",
    service: "Billing",
  },
  "roles/billing.projectManager": {
    title: "Project Billing Manager",
    description: "Manage billing for projects.",
    service: "Billing",
  },
  "roles/billing.costsManager": {
    title: "Billing Costs Manager",
    description: "Manage cost control for billing accounts.",
    service: "Billing",
  },

  "roles/iam.securityAdmin": {
    title: "Security Admin",
    description: "Administer security policies and configurations.",
    service: "Security",
  },
  "roles/iam.securityReviewer": {
    title: "Security Reviewer",
    description: "View security policies and configurations.",
    service: "Security",
  },
  "roles/iam.workloadIdentityUser": {
    title: "Workload Identity User",
    description: "Impersonate service accounts from GKE workloads.",
    service: "IAM",
  },
  "roles/iam.organizationRoleAdmin": {
    title: "Organization Role Administrator",
    description: "Administer custom roles in the organization.",
    service: "IAM",
  },
  "roles/iam.organizationRoleViewer": {
    title: "Organization Role Viewer",
    description: "View custom roles in the organization.",
    service: "IAM",
  },

  "roles/cloudidentity.groupAdmin": {
    title: "Groups Administrator",
    description: "Administer Cloud Identity groups.",
    service: "Cloud Identity",
  },
  "roles/cloudidentity.groupCreator": {
    title: "Groups Creator",
    description: "Create Cloud Identity groups.",
    service: "Cloud Identity",
  },
  "roles/cloudidentity.groupViewer": {
    title: "Groups Viewer",
    description: "View Cloud Identity groups.",
    service: "Cloud Identity",
  },

  "roles/logging.privateLogViewer": {
    title: "Private Logs Viewer",
    description: "Access to private logs.",
    service: "Logging",
  },
  "roles/logging.configWriter": {
    title: "Logs Configuration Writer",
    description: "Configure log routing and sinks.",
    service: "Logging",
  },
  "roles/logging.bucketWriter": {
    title: "Logs Bucket Writer",
    description: "Write to log buckets.",
    service: "Logging",
  },

  "roles/cloudasset.owner": {
    title: "Cloud Asset Owner",
    description: "Full control of Cloud Asset Inventory resources.",
    service: "Cloud Asset",
  },
  "roles/cloudasset.viewer": {
    title: "Cloud Asset Viewer",
    description: "View Cloud Asset Inventory resources.",
    service: "Cloud Asset",
  },

  "roles/servicemanagement.admin": {
    title: "Service Management Administrator",
    description: "Full control of Service Management resources.",
    service: "Service Management",
  },
  "roles/servicemanagement.configEditor": {
    title: "Service Management Configuration Editor",
    description: "Edit Service Management configurations.",
    service: "Service Management",
  },
  "roles/servicemanagement.serviceConsumer": {
    title: "Service Management Service Consumer",
    description: "Consume services managed by Service Management.",
    service: "Service Management",
  },

  "roles/clouddeploy.admin": {
    title: "Cloud Deploy Admin",
    description: "Full control of Cloud Deploy resources.",
    service: "Cloud Deploy",
  },
  "roles/clouddeploy.developer": {
    title: "Cloud Deploy Developer",
    description: "Create and manage Cloud Deploy resources.",
    service: "Cloud Deploy",
  },
  "roles/clouddeploy.viewer": {
    title: "Cloud Deploy Viewer",
    description: "View Cloud Deploy resources.",
    service: "Cloud Deploy",
  },
  "roles/clouddeploy.releaser": {
    title: "Cloud Deploy Releaser",
    description: "Create releases in Cloud Deploy.",
    service: "Cloud Deploy",
  },
  "roles/clouddeploy.operator": {
    title: "Cloud Deploy Operator",
    description: "Approve and rollback releases in Cloud Deploy.",
    service: "Cloud Deploy",
  },

  "roles/storageinsights.admin": {
    title: "Storage Insights Admin",
    description: "Full control of Storage Insights resources.",
    service: "Storage Insights",
  },
  "roles/storageinsights.viewer": {
    title: "Storage Insights Viewer",
    description: "View Storage Insights resources.",
    service: "Storage Insights",
  },

  "roles/vertexai.admin": {
    title: "Vertex AI Administrator",
    description: "Full control of Vertex AI resources.",
    service: "Vertex AI",
  },
  "roles/vertexai.user": {
    title: "Vertex AI User",
    description: "Use Vertex AI resources.",
    service: "Vertex AI",
  },
  "roles/vertexai.viewer": {
    title: "Vertex AI Viewer",
    description: "View Vertex AI resources.",
    service: "Vertex AI",
  },

  "roles/compute.securityPolicyAdmin": {
    title: "Cloud Armor Security Policy Admin",
    description: "Full control of Cloud Armor security policies.",
    service: "Cloud Armor",
  },
  "roles/compute.securityPolicyUser": {
    title: "Cloud Armor Security Policy User",
    description: "Use Cloud Armor security policies.",
    service: "Cloud Armor",
  },

  "roles/domains.admin": {
    title: "Cloud Domains Admin",
    description: "Full control of Cloud Domains resources.",
    service: "Cloud Domains",
  },
  "roles/domains.viewer": {
    title: "Cloud Domains Viewer",
    description: "View Cloud Domains resources.",
    service: "Cloud Domains",
  },

  "roles/apigateway.admin": {
    title: "API Gateway Admin",
    description: "Full control of API Gateway resources.",
    service: "API Gateway",
  },
  "roles/apigateway.viewer": {
    title: "API Gateway Viewer",
    description: "View API Gateway resources.",
    service: "API Gateway",
  },

  "roles/source.admin": {
    title: "Source Repository Administrator",
    description: "Full control of Cloud Source Repositories.",
    service: "Cloud Source Repositories",
  },
  "roles/source.reader": {
    title: "Source Repository Reader",
    description: "Read access to source code repositories.",
    service: "Cloud Source Repositories",
  },
  "roles/source.writer": {
    title: "Source Repository Writer",
    description: "Write access to source code repositories.",
    service: "Cloud Source Repositories",
  },

  "roles/cloudprofiler.agent": {
    title: "Cloud Profiler Agent",
    description: "Access to submit profile data to Cloud Profiler.",
    service: "Cloud Profiler",
  },
  "roles/cloudprofiler.user": {
    title: "Cloud Profiler User",
    description: "Access to view Cloud Profiler data.",
    service: "Cloud Profiler",
  },

  "roles/cloudtrace.admin": {
    title: "Cloud Trace Admin",
    description: "Full control of Cloud Trace resources.",
    service: "Cloud Trace",
  },
  "roles/cloudtrace.agent": {
    title: "Cloud Trace Agent",
    description: "Write traces to Cloud Trace.",
    service: "Cloud Trace",
  },
  "roles/cloudtrace.user": {
    title: "Cloud Trace User",
    description: "Read access to Cloud Trace data.",
    service: "Cloud Trace",
  },

  "roles/errorreporting.admin": {
    title: "Error Reporting Admin",
    description: "Full control of Error Reporting resources.",
    service: "Error Reporting",
  },
  "roles/errorreporting.user": {
    title: "Error Reporting User",
    description: "Access to view Error Reporting data.",
    service: "Error Reporting",
  },
  "roles/errorreporting.writer": {
    title: "Error Reporting Writer",
    description: "Write access to Error Reporting data.",
    service: "Error Reporting",
  },

  "roles/clouddebugger.agent": {
    title: "Cloud Debugger Agent",
    description: "Access for debugger agents to register with the service.",
    service: "Cloud Debugger",
  },
  "roles/clouddebugger.user": {
    title: "Cloud Debugger User",
    description: "Access to use Cloud Debugger.",
    service: "Cloud Debugger",
  },

  "roles/cloudkms.cryptoKeyEncrypterDecrypter": {
    title: "Cloud KMS CryptoKey Encrypter/Decrypter",
    description: "Encrypt and decrypt data using Cloud KMS keys.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.publicKeyViewer": {
    title: "Cloud KMS Public Key Viewer",
    description: "View public keys in Cloud KMS.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.signer": {
    title: "Cloud KMS Signer",
    description: "Sign data using Cloud KMS keys.",
    service: "Cloud KMS",
  },
  "roles/cloudkms.signerVerifier": {
    title: "Cloud KMS Signer/Verifier",
    description: "Sign and verify data using Cloud KMS keys.",
    service: "Cloud KMS",
  },

  "roles/websecurityscanner.editor": {
    title: "Web Security Scanner Editor",
    description: "Edit Web Security Scanner scan configurations.",
    service: "Web Security Scanner",
  },
  "roles/websecurityscanner.viewer": {
    title: "Web Security Scanner Viewer",
    description: "View Web Security Scanner scan configurations and results.",
    service: "Web Security Scanner",
  },

  "roles/datacatalog.admin": {
    title: "Data Catalog Admin",
    description: "Full control of Data Catalog resources.",
    service: "Data Catalog",
  },
  "roles/datacatalog.categoryAdmin": {
    title: "Data Catalog Category Admin",
    description: "Administer taxonomies and policy tags.",
    service: "Data Catalog",
  },
  "roles/datacatalog.entryGroupCreator": {
    title: "Data Catalog Entry Group Creator",
    description: "Create entry groups in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.entryGroupOwner": {
    title: "Data Catalog Entry Group Owner",
    description: "Full control of entry groups in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.entryViewer": {
    title: "Data Catalog Entry Viewer",
    description: "View entries in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.tagTemplateCreator": {
    title: "Data Catalog Tag Template Creator",
    description: "Create tag templates in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.tagTemplateOwner": {
    title: "Data Catalog Tag Template Owner",
    description: "Full control of tag templates in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.tagTemplateUser": {
    title: "Data Catalog Tag Template User",
    description: "Use tag templates in Data Catalog.",
    service: "Data Catalog",
  },
  "roles/datacatalog.viewer": {
    title: "Data Catalog Viewer",
    description: "View Data Catalog resources.",
    service: "Data Catalog",
  },

  "roles/deploymentmanager.editor": {
    title: "Deployment Manager Editor",
    description: "Edit Deployment Manager deployments.",
    service: "Deployment Manager",
  },
  "roles/deploymentmanager.viewer": {
    title: "Deployment Manager Viewer",
    description: "View Deployment Manager deployments.",
    service: "Deployment Manager",
  },
  "roles/deploymentmanager.typeEditor": {
    title: "Deployment Manager Type Editor",
    description: "Edit Deployment Manager types.",
    service: "Deployment Manager",
  },
  "roles/deploymentmanager.typeViewer": {
    title: "Deployment Manager Type Viewer",
    description: "View Deployment Manager types.",
    service: "Deployment Manager",
  },

  "roles/securitycenter.admin": {
    title: "Security Center Admin",
    description: "Full control of Security Command Center resources.",
    service: "Security Command Center",
  },
  "roles/securitycenter.assetsViewer": {
    title: "Security Center Assets Viewer",
    description: "View assets in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.findingsEditor": {
    title: "Security Center Findings Editor",
    description: "Edit findings in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.findingsViewer": {
    title: "Security Center Findings Viewer",
    description: "View findings in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.notificationConfigEditor": {
    title: "Security Center Notification Config Editor",
    description: "Edit notification configurations in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.sourcesAdmin": {
    title: "Security Center Sources Admin",
    description: "Administer sources in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.sourcesEditor": {
    title: "Security Center Sources Editor",
    description: "Edit sources in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.sourcesViewer": {
    title: "Security Center Sources Viewer",
    description: "View sources in Security Command Center.",
    service: "Security Command Center",
  },
  "roles/securitycenter.vulnerabilityScanner": {
    title: "Security Center Vulnerability Scanner",
    description: "Scan for vulnerabilities using Security Command Center.",
    service: "Security Command Center",
  },
};

export function getRoleInfo(roleName: string): IAMRoleInfo {
  if (predefinedRoles[roleName]) {
    return predefinedRoles[roleName];
  }

  return {
    title: formatRoleName(roleName),
    description: "",
    service: getRoleService(roleName),
  };
}

export function formatRoleName(role: string): string {
  if (!role) {
    return "Unknown Role";
  }

  const roleName = role.replace(/^roles\//, "");

  if (!roleName) {
    return "Unknown Role";
  }

  const parts = roleName.split(".").filter(Boolean);

  if (parts.length === 0) {
    return "Unknown Role";
  }

  return parts
    .map((part) => {
      if (!part.trim()) {
        return "";
      }

      return part
        .trim()
        .split(/(?=[A-Z])/)
        .map((word) => {
          if (!word) return "";
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .filter(Boolean)
        .join(" ");
    })
    .filter(Boolean)
    .join(" - ");
}

export function getRoleService(role: string): string {
  if (!role) {
    return "Other";
  }

  const baseName = role.split("/").pop() || role;

  const parts = baseName.split(".").filter(Boolean);

  if (parts.length > 0 && parts[0]) {
    const service = parts[0].trim();

    if (!service) {
      return "Other";
    }

    return service.charAt(0).toUpperCase() + service.slice(1).toLowerCase();
  }

  return "Other";
}
