This is a Raycast script for checking for open rooms in Teamup. The specific use case I designed this for is checking for open rooms in my coworking space (ie. finding a room open _now_ or in the _next x minutes_), but I am open to extending it for other use cases as needed.

## Extension Preferences

### Required Preferences

This script is currently limited to one calendar. To configure, you must add values for three preferences:

- **Teamup API Token**: This is your API token from Teamup. You can request it at [https://teamup.com/api-keys/request](https://teamup.com/api-keys/request) or find out more information in Teamup's [API documentation](https://apidocs.teamup.com/).
- **Teamup Calendar ID**: This should be the ID calendar you wish to check for open rooms on. It can be found in the url of your calendar's shareable webpage. ( https\://teamup.com/**CALENDAR_ID** ).
  - This is _not_ the url you see when managing a calendar on your account. If the url starts with _https\://teamup.com/**c**/..._, you're on the wrong page. The Teamup knowledgebase has information on how to share your calendar or find your sharing link at [https://calendar.teamup.com/kb/how-to-share-your-teamup-calendar-users-groups-links/](https://calendar.teamup.com/kb/how-to-share-your-teamup-calendar-users-groups-links/).
  - Your calendar URL will look like this: <br />
    ![Screenshot of Teamup calendar URL](https://raw.githubusercontent.com/raycast/extensions/3403bebc084d4bd41adfcd957c0e374a4029fd53/extensions/teamup-rooms/media/teamup_calendar_url.png)
- **Default Event Title**: When creating an event, the extension will use this as the event title. This will be customizable on a per-event basis in a later release.

### Optional Preferences

- **Calendar Password**: If your calendar requires a password, add it here. This should have been provided to you when the calendar link was shared with you.
