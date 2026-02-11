# Translate and Send Webpage to Reader

A Raycast extension that enhances your web reading experience by automatically translating active webpage content using Raycast AI and seamlessly sending it to Readwise Reader.

While there's an existing [Reader extension](https://www.raycast.com/zach/readwise-reader) in the Raycast Extension Store that allows saving webpage URLs to Reader, neither Readwise Reader nor the Raycast extension supports content translation before saving. This extension bridges that gap.

This extension works by:

1. Capturing the markdown content of your active webpage through the Raycast browser extension
2. Translating the content to your desired target language using Raycast AI GPT 4o mini
3. Saving the translated content directly to Reader Later via the Reader API

## Requirements

- [Readwise Reader](https://readwise.io/read) API Token.
- Translation require Raycast AI

## Setup Instructions

1. Get your Readwise API Token:
   - Sign in to [Readwise](https://readwise.io/)
   - Navigate to [Access Token page](https://readwise.io/access_token)
   - Copy your API Token

2. Configure the extension:
   - Open Raycast
   - Locate "Translate and Send Webpage to Reader" extension settings
   - Paste your Readwise API Token, Set Target Language.
 