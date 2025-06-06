# GCP Raycast Extension Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

2. **Configure authentication** (choose one):
   - **Option A: Application Default Credentials (Recommended)**
     ```bash
     gcloud auth application-default login
     ```
   
   - **Option B: Service Account Key**
     - Create a service account in GCP Console
     - Download the JSON key file
     - Set the file path in Raycast preferences

3. **Set your GCP Project ID** in Raycast preferences

4. **Build and run**
   ```bash
   npm run build
   npm run dev
   ```

## Required GCP APIs

Enable these APIs in your GCP project:
- Compute Engine API
- Cloud Storage API
- Cloud Run API
- Cloud Functions API

## Required IAM Permissions

Your account needs these roles:
- `roles/compute.viewer`
- `roles/storage.objectViewer`
- `roles/run.viewer`
- `roles/cloudfunctions.viewer`

## Troubleshooting

- **Authentication errors**: Run `gcloud auth application-default login`
- **Permission errors**: Check IAM roles in GCP Console
- **API errors**: Ensure all required APIs are enabled
