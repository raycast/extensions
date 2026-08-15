# DataHub Utility

Search and explore datasets in your [DataHub](https://datahubproject.io/) data catalog directly from Raycast.

## Features

- **Quick Search**: Instantly search your DataHub catalog with the `Search Datahub` command
- **Dataset Explorer**: Browse and find detailed information about datasets with `Search Datasets`
- **Copy Links & URNs**: Easily share links to datasets

## Setup

Before using this extension, you need to configure it with your DataHub URLs:

1. Set your DataHub frontend URL (e.g., `https://datahub.yourdomain.com`)
2. Set your DataHub GraphQL API endpoint (e.g., `https://datahub-gms.yourdomain.com/api/graphql`)

### Finding Your DataHub Endpoints

#### Frontend URL

This is the URL you typically use to access DataHub in your browser. Common patterns include:

- `https://datahub.yourdomain.com`
- `https://yourdomain.com/datahub`
- For locally hosted instances: `http://localhost:9002`

#### GraphQL API Endpoint

This is the endpoint for DataHub's metadata service API. Common patterns include:

- `https://datahub-gms.yourdomain.com/api/graphql`
- `https://yourdomain.com/datahub/api/graphql`
- Same domain as frontend: `https://datahub.yourdomain.com/api/graphql`
- For locally hosted instances: `http://localhost:8080/api/graphql`

**Not sure about your endpoints?**

- Ask your DataHub administrator or DevOps team
- If you have access to your DataHub's deployment configuration, check the `DATAHUB_GMS_HOST` and `DATAHUB_FRONTEND_HOST` environment variables
- Try opening your frontend URL + `/api/graphql` in a browser - if you see a GraphQL interface, that's your GraphQL endpoint

## Usage

- `dh [query]` - Search for anything in DataHub and open results in your browser
- `dhdataset` - Find specific datasets with interactive results
  1. Type `dhdataset` and press Enter/Return
  2. In the search interface that appears, type your dataset query
  3. Results will update as you type
  4. Select a dataset to see available actions

## Troubleshooting

If you encounter connection issues:

- Verify that your endpoints are accessible from your machine
- Ensure you have the correct authentication set up if your DataHub instance requires it
- Check that your DataHub version is compatible (this extension works with DataHub v0.8.0+)
