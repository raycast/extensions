# Outline Search

Search for documents in one or more instances of [Outline](https://www.getoutline.com), including the Cloud and Self-Managed instances.

## Setup

This extension interfaces with Outline's API, so you need to [grab an API key](https://www.getoutline.com/developers#section/Authentication) from your Outline instance(s). Afterward, you can configure the extension by creating and selecting a JSON file that specifies the Outline instances that you want to access in Raycast:

```json
[
  {
    "name": "Personal",
    "url": "https://app.getoutline.com",
    "apiKey": "ol_api_..."
  },
  {
    "name": "Work",
    "url": "https://outline.work.com",
    "apiKey": "ol_api_..."
  }
]
```

## Usage

This extension provides a single command to search for documents across all configured Outline instances. If you specify multiple instances of Outline, you have to select in which of them you want to perform the search. The search results display the matching documents by Outline instance that you can open in your default browser.
