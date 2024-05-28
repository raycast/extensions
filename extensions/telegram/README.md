# Telegram RayClient

The Telegram RayClient API allows you to send quick messages to your Telegram contacts.

## Setup

To use this API, you need to provide your API ID and API hash. These can be set in the preferences pane.

### Obtaining API ID and Hash

1. Visit the [Telegram API website](https://my.telegram.org/auth).
2. Log in and create a new application.
3. Copy the provided API ID and hash.

## Usage

When you run the 'Quick Message' command for the first time, the application will ask for your phone number. This is necessary because the Telegram userbot APIs, which are used to send messages, require explicit access. This access is granted by logging in. An authentication code will then be sent to your Telegram app.

This authentication process creates a session key. This key is used for all future authentications and message transmissions to your contacts.