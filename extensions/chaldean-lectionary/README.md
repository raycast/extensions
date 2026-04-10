# Chaldean Lectionary

A Raycast extension for viewing daily readings from the Chaldean Catholic Church lectionary.

## Setup

This extension requires Google Calendar integration to determine liturgical dates. Follow these steps to set it up:

### 1. Create a Google Calendar for Liturgical Dates

1. Go to [Google Calendar](https://calendar.google.com)
2. Create a new calendar called "Chaldean Liturgical Calendar"
3. Add events for important liturgical dates (e.g., Christmas, Easter, etc.)

### 2. Get Your Google API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create credentials (API Key)
5. Restrict the API key to the Google Calendar API for security

### 3. Configure the Extension

In Raycast preferences for this extension:

- **Google Calendar ID**: Enter the calendar ID from your liturgical calendar (found in calendar settings)
- **Google API Key**: Enter your Google API key

The calendar ID can be found in Google Calendar settings under "Integrate calendar" for your calendar.

## Usage

- **Today's Readings**: View the readings for today
- **Look up Readings**: Search for readings on any specific date

## Features

- Displays daily scripture readings from the Chaldean lectionary
- Supports both weekday and Sunday readings
- Integrates with Google Calendar for accurate liturgical dates
- Fetches scripture text from the USCCB website
