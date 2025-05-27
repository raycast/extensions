# GCP Raycast Extension

A Raycast extension for browsing and managing Google Cloud Platform resources.

## Features

- **Compute Engine**: Browse and manage VM instances
  - View instance details (status, IP addresses, machine type)
  - Start/stop/restart instances
  - Copy SSH commands
  - Open instances in GCP Console

- **Cloud Storage**: Browse storage buckets
  - View bucket details (location, storage class, size)
  - Copy bucket URLs and gsutil commands
  - Open buckets in GCP Console

- **Cloud Run**: Browse Cloud Run services
  - View service details (status, URL, traffic distribution)
  - Copy service URLs and deployment commands
  - Open services in GCP Console

- **Cloud Functions**: Browse Cloud Functions
  - View function details (status, runtime, trigger type)
  - Copy function URLs (for HTTP triggers)
  - Open functions in GCP Console

## Setup

### Prerequisites

1. Google Cloud SDK installed and configured
2. A GCP project with the necessary APIs enabled:
   - Compute Engine API
   - Cloud Storage API
   - Cloud Run API
   - Cloud Functions API

### Installation

1. Install the extension from the Raycast store

### Configuration

The extension supports two authentication methods:

1. **Application Default Credentials (ADC)** - Recommended
   - Run `gcloud auth application-default login`
   - Leave the service account path empty in preferences

2. **Service Account Key**
   - Create a service account with the necessary permissions
   - Download the JSON key file
   - Set the path to the key file in the extension preferences

### Required Permissions

The service account or user needs the following roles:
- `roles/compute.instanceAdmin.v1` - For Compute Engine instances (view and manage)
- `roles/storage.objectViewer` - For Cloud Storage buckets
- `roles/run.viewer` - For Cloud Run services
- `roles/cloudfunctions.viewer` - For Cloud Functions

## Development

```bash
# Run in development mode
npm run dev

# Lint code
npm run lint

# Fix lint issues
npm run fix-lint
```

## Technologies Used

- **Google Cloud SDK Libraries**:
  - `@google-cloud/compute` - For Compute Engine operations
  - `@google-cloud/storage` - For Cloud Storage operations
  - `@google-cloud/functions` - For Cloud Functions operations
  - `google-auth-library` - For authentication
- **Raycast API** - For the extension UI
- **TypeScript** - For type safety

## License

MIT
