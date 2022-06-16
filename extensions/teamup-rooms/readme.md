This is a Raycast script for checking for open rooms in Teamup. The specific use case I designed this for is checking for open rooms in my coworking space (ie. finding a room open _now_ or in the _next x minutes_), but I am open to extending it for other use cases as needed.

This script is currently limited to one calendar. To configure, you must add values for two preferences:

- **Calendar ID**: This should be the calendar you wish to check for open rooms on. It can be found in the url of your calendar's webpage. ( https://teamup.com/[CALENDAR_ID] )
- **Token**: This is your API token from Teamup. You can request it at [https://teamup.com/api-keys/request](https://teamup.com/api-keys/request) or find out more information in Teamup's [API documentation](https://apidocs.teamup.com/).
