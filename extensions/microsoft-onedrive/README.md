# Microsoft OneDrive

Search, browse, and manage files across OneDrive and SharePoint using the Microsoft Graph API.

## Commands

| Command | Description |
|---------|-------------|
| **Search Files** | Search and browse files with folder navigation, uploads, downloads, and sharing |
| **My Recent Files** | View recently accessed files (work/school accounts only) |

## Features

- Search across OneDrive and SharePoint document libraries
- Browse folder hierarchies (`Tab` to enter, `Shift+Tab` to go back)
- Switch between drives via dropdown
- Thumbnail previews and detailed metadata (size, dates, author, photo/video info)
- Open files in browser or desktop Office apps
- Create shareable links (public or organization-only, with expiration options)
- Download, upload, and delete files
- Pagination and filtering

## SharePoint Setup

To access SharePoint libraries:
1. Open in your browser the SharePoint sites you want to access and click the **star icon** (☆) to follow them
2. Return to the extension - followed sites will automatically appear in the drive selection dropdown
3. Each site shows all its document libraries for easy access

## Security

- All OAuth tokens are securely stored using Raycast's token storage
- The extension uses PKCE (Proof Key for Code Exchange) for secure OAuth authentication
- Access tokens are automatically refreshed when expired
- You can log out at any time through Raycast's preferences, which will clear all stored tokens

## Privacy

This extension:
- Only accesses files you have permission to view in OneDrive and SharePoint
- Does not collect, store, or transmit any personal information
- Communicates directly with Microsoft Graph API - no third-party servers involved
- You can revoke access at any time through your Microsoft account settings

## Author

Developed by Arthur Pinheiro ([@xilopaint on GitHub](https://github.com/xilopaint)).

## License

Distributed under the MIT License.
