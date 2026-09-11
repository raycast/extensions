# LinkAce

Save and organize links in your self-hosted LinkAce instance directly from Raycast.

[LinkAce](https://www.linkace.org/) is a self-hosted bookmark archive to collect links of your favorite websites. This extension allows you to quickly save links without leaving Raycast.

## Features

- **Add Link**: Open a full form to save a link with title, description, tags, and privacy settings
- **Quick Add Link**: Instantly save a link from your clipboard or argument with default settings

## Setup

### 1. Get Your LinkAce API Token

1. Open your LinkAce instance in a browser
2. Go to **Settings** → **Account Settings**
3. Scroll to the **API Token** section
4. Click **Generate new API token** (or copy your existing token)
5. Copy the token - you'll need it in the next step

### 2. Configure the Extension

When you first run the extension, you'll be prompted to configure:

- **LinkAce Base URL**: Your LinkAce instance URL (e.g., `https://linkace.example.com`)
- **API Token**: Paste the token from step 1
- **Default Tags** (optional): Comma-separated tags to add to all links (e.g., `raycast, bookmarks`)
- **Private by Default** (optional): Check this to make all new links private by default

You can also configure these later in **Raycast Settings** → **Extensions** → **LinkAce**.

## Usage

### Add Link

Opens a form where you can:
- Enter or paste a URL
- Add a custom title
- Add a description
- Add tags (comma-separated)
- Set privacy (public or private)

### Quick Add Link

Quickly saves a link with minimal interaction:
- Run the command and pass a URL as an argument, or
- Copy a URL to your clipboard and run the command
- The link will be saved with your default settings

## Privacy & Security

Your API token is securely stored in Raycast preferences and is never logged or transmitted anywhere except to your LinkAce instance.
