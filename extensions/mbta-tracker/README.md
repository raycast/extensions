# MBTA Tracker

Provides a way to quickly check departure times for stops along MBTA routes

## Background

This extension allows you to look up departure times for subway, bus, and commuter rail lines operated by the [Massachusetts BayTransportation Authority](https://www.mbta.com/). Data is retrieved using the [MBTA API](https://api-v3.mbta.com/).

## Command Usage

Use the "Browse Stops" command to narrow down a route (e.g., "Red Line"), travel direction (e.g., "Southbound toward Ashmont/Braintree"), and stop (e.g., "Kendall/MIT").

### Viewing Departure Times

Once your desired stop is selected, the default action will show the upcoming predicted departure times. The default action on any predicted departure will open the same information on the MBTA website, allowing you to check other schedules or utlize the trip planner.

### Saving Favorites
Once your desired stop is selected, use the "Add Favorite" command from the actions panel. It will then be available to quickly check departure predictions from the "View Favorites" command.

## Using your own MBTA API key (optional)

The MBTA V3 API does not require an API key for authentication, but you may [register for a developer account](https://api-v3.mbta.com/register) and provide your own key.
Note that requests made without an API key are subject to a limit of 20 requests per minute: https://www.mbta.com/developers/v3-api/best-practices

Enter the key in the MBTA Tracker extension settings in your [Raycast Preferences](https://manual.raycast.com/preferences).
