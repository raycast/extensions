# Raycast Google Calendar Extension

![Icon](/assets/extension-icon-sm.png)

Raycast extension to manage your Google Calendar.  
Designed to be delightful and productive to use.

## Setting up the extension

You will need to add a Google Client ID to the extension preferences.  
See the [Set up a Google Client ID](#set-up-a-google-client-id) section below for instructions.

> [!IMPORTANT]
>
> I am working on setting up a Google OAuth application for public use, however the application process takes a while.
> Until then, you will need to add your own Google Client ID to the extension preferences.

## Features

- **Create events** quickly
- **See upcoming meetings** and their status
- **Join Google Meet** conferences
- **Manage your calendars** and choose the ones that are of interest for you to see from Raycast

## Set up a Google Client ID

Follow the instructions on the Raycast developer documentation:
https://developers.raycast.com/utilities/oauth/getting-google-client-id

tl;dr:

1. Create a new Google Cloud project ([quick link](https://console.cloud.google.com/projectcreate))
1. Enable the Google Calendar API for your project ([quick link](https://console.cloud.google.com/apis/api/calendar-json.googleapis.com))
1. Set up the OAuth Consent Screen ([quick link](https://console.cloud.google.com/apis/credentials/consent)) with the following details:
   1. App name: Raycast (Your Extension Name)
   1. User support email: your-email@example.com
   1. Logo: Paste Raycast's logo over there (Link to Raycast logo)
   1. Application home page: https://www.raycast.com
   1. Application privacy policy link: https://www.raycast.com/privacy
   1. Application terms of service link: https://www.raycast.com/terms-of-service
   1. Authorized domains: Click ADD DOMAIN then add raycast.com
   1. Developer contact: your-email@example.com
1. Add the `https://www.googleapis.com/auth/calendar` scope (or search for "Google Calendar API")
1. Create an OAuth Client ID ([quick link](https://console.cloud.google.com/apis/credentials):
   1. Click the "Create Credentials" button
   1. Click "OAuth client ID"
   1. Choose "iOS" for the application type
   1. Use "com.raycast" for the bundle ID
1. Go to your newly created OAuth Client ID and copy the client ID for when you first use the app
