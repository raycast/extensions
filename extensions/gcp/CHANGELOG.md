# Google Cloud Platform Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Features
- Browse and manage Compute Engine instances
  - View instance details (status, IP addresses, machine type)
  - Start, stop, and restart instances
  - Copy SSH commands for quick access
  - Open instances directly in GCP Console

- Browse and manage Cloud Storage buckets
  - View bucket details including location and storage class
  - Copy bucket URLs and gsutil commands
  - Quick access to buckets in GCP Console

- Browse and manage Cloud Run services
  - View service status and URLs
  - See traffic distribution across revisions
  - Copy deployment commands
  - Open services in GCP Console

- Browse and manage Cloud Functions
  - View function details (runtime, trigger type, status)
  - Copy HTTP URLs for HTTP-triggered functions
  - Access functions in GCP Console

### Authentication
- Support for Application Default Credentials (ADC)
- Support for Service Account key file authentication
- Automatic token refresh and credential management

### Technical Details
- Built with TypeScript for type safety
- Uses Google Cloud SDK libraries where stable
- REST API implementation for compatibility
- Parallel region checking for better performance
- Intelligent caching to improve responsiveness:
  - 1 minute cache for Compute Instances (status changes frequently)
  - 2 minute cache for Cloud Run services
  - 5 minute cache for Cloud Functions and Storage Buckets
  - Manual refresh available with ⌘R
  - Cache automatically clears after instance actions (start/stop/restart)
