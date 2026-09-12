# Subnoto - Confidential Electronic Signature

Send and manage documents for electronic signature in [Subnoto](https://subnoto.com) directly from Raycast. Upload documents, browse workspaces, and open envelopes without leaving your workflow.

## Features

### Upload Document

- **Upload to any workspace**: Pick a Subnoto workspace from a dropdown and upload a PDF or Word document in one step.
- **Custom envelope title**: Set a title for the envelope or leave it blank to use the filename.
- **Open in browser**: After upload, the envelope edit page opens in your browser so you can add recipients and signature fields right away.

### List Workspaces

- **See all workspaces**: View your Subnoto workspaces with name and member count.
- **Quick actions**: Open a workspace in Subnoto or copy its UUID to the clipboard.
- **Refresh**: Reload the list without leaving the command.

### List Envelopes

- **Browse by workspace**: Filter envelopes by workspace (or view all) using the dropdown.
- **Search and paginate**: Search envelopes and load more as you scroll.
- **Envelope details**: See title, status, last update, and signature progress (e.g. 2/3 signatures).
- **Quick actions**: Open an envelope in Subnoto or copy its UUID.

## Setup

### Prerequisites

You need a Subnoto account with API access. Sign up at [subnoto.com](https://subnoto.com) if you don’t have one.

### API keys

1. Log in to your [Subnoto dashboard](https://app.subnoto.com).
2. Go to **Settings** → **API Keys**.
3. Create a new API key pair (Access Key and Secret Key).
4. Copy both keys for the extension preferences.

### Extension configuration

1. Open Raycast and run any Subnoto command (e.g. **Upload Document** or **List Workspaces**).
2. When prompted, enter:
   - **API Access Key**: your Subnoto API access key
   - **API Secret Key**: your Subnoto API secret key

## Usage

| Command             | What it does                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Upload Document** | Choose a workspace, pick a file, optionally set a title, then upload. The envelope edit page opens in your browser. |
| **List Workspaces** | View workspaces, open one in Subnoto, or copy its UUID.                                                             |
| **List Envelopes**  | Browse envelopes (optionally by workspace), search, then open in Subnoto or copy UUID.                              |

## Supported file types

- **PDF** (.pdf)
- **Microsoft Word** (.doc, .docx)
- **OpenDocument Text** (.odt)
- **Rich Text Format** (.rtf)

Maximum file size: **50 MB**.

## Links

- [Subnoto Website](https://subnoto.com)
- [Subnoto Documentation](https://subnoto.com/documentation)
- [TypeScript SDK Documentation](https://subnoto.com/documentation/developers/sdks/typescript)

## About embedded binary

The extension uses a binary file to authenticate with the Subnoto API. The binary comes from the `@subnoto/api-client` package and is moved as it and is then located in the `assets/oak_session_wasm_nodejs_bg.wasm` file.

To move the binary, run the following command: `npm run move-subnoto-wasm`, this is done automatically when you `npm install`.
