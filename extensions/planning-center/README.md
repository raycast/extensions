# Planning Center for Raycast

_Copyright 2025 Caleb Evans_  
_Released under the MIT license_

Quickly look up people in Planning Center and copy their contact info using Raycast.

## Connecting to your Planning Center account

### 1. Generate Personal Access Token

1. Visit https://api.planningcenteronline.com/oauth/applications (log in if prompted)
2. Scroll down the page to the **Personal Access Tokens** section
3. Click the **Create one now** button
4. Copy the **Application ID** and **Secret**; save them to a safe place

Do not share the Application ID and Secret with anyone. Together, they grant access to your entire Planning Center account, so they should be handled with great care.

### 2. Enter ID and Secret into Raycast preferences

After installing the extension, open **Raycast Preferences → Extensions → Planning Center** for Raycast, and enter your App ID and Secret in the provided
fields on the right-hand side.

## Usage

### Search for people

To search for people, open Raycast and run the "Look up Planning Center People"
command. You can search by name, phone number, or email address.

#### Examples

- `caleb`
- `caleb@calebevans.me`
- `123-456-7890`

#### Copy to clipboard

When searching for people, you can:

- Press **Enter** to open the person's details page in Planning Center within
  your browser.
- Press **Command-Enter** to copy the person's phone number to the clipboard.
- Press **Option-Enter** to copy the person's email address to the clipboard.

## Local Development

To run the extension locally in Raycast for development:

1. Clone this repository and install dependencies:

   ```sh
   git clone https://github.com/caleb531/planning-center-raycast.git
   cd planning-center-raycast
   npm install
   ```

2. Start the development server:

   ```sh
   npm run dev
   ```

After you've run `npm run dev` for the first time, the local extension will be
installed into Raycast, so you do not need to keep the process running unless
you want to test changes locally.

## Disclaimer

This project is not affiliated with Planning Center.
