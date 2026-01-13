# WHMCS Client Search

Search your WHMCS Clients and quickly access the client's profile, billable items, and more.

## Required Configuration Parameters

This extension works by building a local copy of the Clients profiles you have setup in your [WHMCS instance](https://www.whmcs.com/). In order to retrieve your clients via the WHMCS API, you'll need to provide:

- WHMCS API URL - URL to your WHMCS install's API endpoint (typically https://example.com/includes/api.php)
- API Identifier - Your WHMCS API Credential identifier
- API Secret - Your WHMCS API Credential secret
- Admin Path - URL to your WHMCS admin area (typically https://example.com/admin).

## Setting up your WHMCS API Credentials

Before you create your API Identifier and Secret, you'll want to ensure you have an API Role setup that includes the `GetClients` API Action. Next, create your API Identifier and Secret in **System Settings > API & Security > API Credentials**.

## About This Extension

[WHMCS](https://www.whmcs.com/) is a web hosting automation software used by web hosts for client billing, hosting automation, and support ticketing. This extension greatly simplifies the day-to-day tasks of working with clients in your WHMCS.
