# DayCal Privacy Policy

**Effective date:** 18 September 2026

DayCal is a Google Calendar extension for Raycast. Privacy and security are core design priorities: DayCal is built to work directly between Raycast on your Mac and Google Calendar, without a DayCal-operated backend service.

## Summary

- DayCal does **not** operate a server that receives your calendar data.
- DayCal does **not** sell user data.
- DayCal does **not** use calendar data for advertising, profiling, analytics, tracking, or training AI/ML models.
- Google OAuth tokens are managed by Raycast.
- Calendar preferences, account-scoped configuration, and a local menu-bar event cache are stored locally through Raycast on your Mac.
- DayCal requests only the Google Calendar scopes needed for its visible calendar features.

## Google data DayCal accesses

DayCal currently requests these Google OAuth scopes:

- `https://www.googleapis.com/auth/calendar.events` — read and manage calendar events;
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly` — read the user's calendar list, calendar colours, and access roles.

Depending on the feature you use, DayCal may access Google Calendar information such as:

- calendar names, colours, IDs, and access roles;
- event titles, dates, start/end times, and all-day status;
- event descriptions and locations;
- organiser/attendee metadata and response status;
- conference/meeting links;
- reminders, recurrence information, source links, and attachment metadata when present.

DayCal uses this information only to provide user-facing calendar features such as Schedule, Menu Bar, Quick Add, editing, copying, moving, deleting, calendar routing, meeting links, and permission-aware event actions.

## How Google data is transmitted

Calendar API requests are made directly from the Raycast extension to the Google Calendar API at `www.googleapis.com` using the Google OAuth access token supplied by Raycast.

DayCal does not proxy those requests through a DayCal-owned server.

When you explicitly choose **Open Event**, **Open in Google Calendar**, or **Open Calendar**, DayCal opens the Google Calendar event or calendar link in your default browser for the connected Google account. Actions such as **Open Location** or **Join Meeting** may open the relevant maps, conferencing, or other event-provided URL using the system default handler. Those destinations then operate under their own privacy policies.

## Local storage on your Mac

DayCal stores some information locally through Raycast so the extension can remember your choices and remain responsive.

This can include:

- extension preferences;
- account-scoped calendar role mappings;
- Schedule and Menu Bar calendar selections;
- optional routing keywords;
- menu-bar display settings;
- a local cached snapshot of upcoming calendar events used to render the persistent Menu Bar efficiently without contacting Google every time you open it.

This local event cache can contain calendar event information returned by Google. It is used only for DayCal's local UI and refresh behaviour.

DayCal does not intentionally transmit this locally stored configuration or cache to the developer.

## OAuth tokens

Google OAuth authentication is provided through Raycast's native OAuth support. DayCal does not contain a Google client secret, refresh token, or access token in its public source repository.

The public OAuth client ID is included in the source code because OAuth client IDs are application identifiers, not secrets.

DayCal does not log or intentionally transmit OAuth tokens to the developer.

## Disconnecting and revoking access

The **Disconnect Google Account** command removes DayCal's locally stored Google OAuth tokens through Raycast and clears DayCal's local Menu Bar event cache. Before disconnecting, you choose what happens to the connected account's saved DayCal calendar setup:

- **Keep DayCal Settings** preserves that account's calendar selections, role mappings, routing keywords, and setup-complete state so they are available if the same Google account reconnects later.
- **Delete DayCal Settings** deletes that account's locally saved calendar selections, role mappings, routing keywords, and setup-complete state so reconnecting behaves like a fresh DayCal setup. This does not delete any Google Calendar events.

Extension-wide Raycast preferences are not account-specific and are not deleted by either disconnect option.

Disconnecting inside DayCal does **not** revoke the app's authorization in your Google Account. You can separately revoke Google access from your Google Account's third-party access/security settings.

## Analytics, advertising, and tracking

DayCal currently includes no DayCal-operated analytics, advertising SDK, behavioural tracking, telemetry service, or crash-reporting service that sends calendar data to the developer.

DayCal does not sell, rent, or trade Google user data or DayCal user data.

DayCal does not use Google user data for advertising, credit decisions, or training generalized AI or machine-learning models.

## Human access to calendar data

The developer does not receive or routinely have access to your calendar data through DayCal.

If you choose to submit a GitHub issue, screenshot, screen recording, log, or other diagnostic information, that information is provided voluntarily by you. Please redact private event details, email addresses, private calendar links, OAuth tokens, and other credentials before posting publicly.

Security-sensitive reports should follow [SECURITY.md](SECURITY.md) instead of being posted publicly.

## Google API Services User Data Policy

DayCal's use and transfer of information received from Google APIs will adhere to the **Google API Services User Data Policy**, including the **Limited Use** requirements.

DayCal requests Google data only for features that are visible to and initiated for the benefit of the user, and does not use that data for unrelated purposes.

## Data sharing

DayCal does not share Google Calendar data with advertisers, data brokers, or unrelated third parties.

Data may be handled by the services required to provide the extension's functionality, principally:

- **Google**, which provides Google Calendar and the Google Calendar API;
- **Raycast**, which provides the extension runtime, native OAuth handling, and local extension storage.

Any additional external destination is opened only when you explicitly trigger an action such as opening a map, conference link, event source link, or calendar page.

## Security

DayCal is open source so its Google API usage and local data handling can be inspected publicly.

The project aims to use the minimum Google scopes required for its current features, avoids embedding secrets in the repository, distinguishes writable/owned events from guest or read-only events, and runs automated regression and TypeScript checks on changes.

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## Changes to this policy

If DayCal's data handling changes materially, this policy will be updated before or alongside that change. The effective date at the top of this document will be revised when appropriate.

## Contact

For privacy questions that do not contain sensitive information, email [support@daycal.co.uk](mailto:support@daycal.co.uk), use the DayCal GitHub repository, or contact the maintainer through the GitHub profile.

For suspected vulnerabilities or anything involving credentials or private calendar data, follow the private reporting guidance in [SECURITY.md](SECURITY.md).
