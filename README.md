# Google Cloud Raycast Extension

This Raycast extension allows you to interact with Google Cloud Platform directly from Raycast.

## Features

- Authenticate with Google Cloud
- List and select Google Cloud projects
- View and interact with common Google Cloud services
- Run gcloud commands directly from Raycast

## Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed on your machine
- A Google Cloud account with at least one project

## Installation

1. Clone this repository
2. Navigate to the directory
3. Run `npm install` to install dependencies
4. Run `npm run dev` to start the development server in Raycast

## Usage

1. Open Raycast and search for "Google Cloud"
2. If not authenticated, click "Login to Google Cloud" to authenticate
3. Once authenticated, you'll see a list of your Google Cloud projects
4. Select a project to view available services and actions
5. Use the actions to interact with your Google Cloud resources

## Configuration

You can configure the path to your gcloud CLI in the extension preferences:

1. Open Raycast
2. Go to Extensions
3. Find "Google Cloud" and click on it
4. Click on "Preferences"
5. Set the path to your gcloud CLI (default is "gcloud")

## Development

- `npm run dev` - Start the development server
- `npm run build` - Build the extension
- `npm run lint` - Lint the code

## License

MIT