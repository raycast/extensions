# Fizzy for Raycast

Browse and manage your Fizzy boards and cards directly from Raycast.

## Features
- Browse boards
- View cards
- Create cards
- Delete cards
- Open boards and cards in Fizzy

## Setup

This extension requires a Fizzy personal access token.

### 1. Create a Personal Access Token
Follow the instructions in the **Fizzy API documentation** under *Authentication*:

https://github.com/basecamp/fizzy/blob/main/docs/API.md#authentication

Create a **Personal Access Token** with read/write access.

### 2. Configure the Extension
Open **Raycast → Extensions → Fizzy → Preferences** and enter:

- **Fizzy Base URL**  
  Leave the default (`https://app.fizzy.do`) unless you are self-hosting Fizzy.

- **Personal Access Token**  
  The token you generated in Fizzy.

- **Account ID**  
  The numeric account slug found in your Fizzy URL  
  (for example: `https://app.fizzy.do/897362094/...` → `897362094`).

## Notes
- Moving cards between columns is not supported due to current Fizzy API limitations.
- All actions are performed using your personal access token and respect your Fizzy permissions.