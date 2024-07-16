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

### Feature: Quick create event

Create an event quickly by typing a title, a human-readable time descrption (e.g., "tomorrow at 10am") and a duration (e.g., "30m").

![Quick create event](/assets/screenshot-quick-create-event.png)

### Feature: Upcoming events

See upcoming events from the Google Calendars you have set to be visible in the extension.

![Upcoming events](/assets/screenshot-upcoming-events.png)

### Feature: Join Google Meet

Join a Google Meet conference straight from Raycast.

![Join Google Meet](/assets/screenshot-join-google-meet.png)

### Feature: Create event

Create an event straight from Raycast.

![Create event](/assets/screenshot-create-event.png)

---

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
