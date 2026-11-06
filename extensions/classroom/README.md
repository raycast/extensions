# Google Classroom for Raycast

Search your courses, read coursework descriptions, and browse due dates without leaving Raycast. Open a selected course or assignment in Classroom when you want to work on it.

## What's new

- Real **submission status**: Turned in, Missing, Done late and Graded (with your grade), or class turn-in counts in teacher mode.
- Coursework is grouped by **Overdue / Today / Tomorrow / This Week / Later** with relative due dates.
- New **Classroom Due Soon** menu bar command showing missing work and what's due this week.

## Commands

- **Search Courses:** Search active or archived courses. Press Return to browse a course's published coursework.
- **Browse Assignments:** Search published coursework across your active courses, with upcoming, past due date, and no due date filters.
- **Connect Google Classroom:** Sign in through Google, confirm both required read-only permissions, and verify course access. This command waits for the OAuth callback rather than starting sign-in inside a short-lived view. Its course count does not prove that a known coursework item has been loaded; open a course or Browse Assignments to check that separately.

Coursework includes assignments and questions. Due dates do not indicate whether work has been submitted. This extension does not create courses, submit assignments, or change grades.

## Connect your account

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/) and enable the Google Classroom API.
2. Configure the OAuth consent screen. For an external app in testing, add your account as a test user. Your school's administrator may need to approve the application.
3. Create an **iOS OAuth client** with bundle ID **com.raycast**, following [Raycast's Google PKCE example](https://github.com/raycast/extensions/blob/main/examples/api-examples/src/oauth/google.tsx). Copy its client ID into the extension's **Google OAuth Client ID** preference. A client secret is not needed.
4. Choose **Student** or **Teacher** in Extension Preferences, then run **Connect Google Classroom**. Grant the requested read-only permissions in Google and let the browser return to Raycast.
5. Open **Search Courses** and browse a course with known coursework. Check the displayed due time against Classroom; times are converted from Google's UTC deadline to your local time.

Student mode asks for `classroom.courses.readonly` and `classroom.coursework.me.readonly`. Teacher mode replaces the latter with `classroom.coursework.students.readonly`. OAuth tokens are stored using Raycast's secure OAuth API and refreshed when expired. Changing the client ID or role uses a separate token store and requires sign-in again. Use Raycast's provider logout setting to remove stored access.

Connect always opens fresh consent, while keeping the previous stored connection until a replacement token and both required permissions have been confirmed. Cancelling consent or a failed exchange leaves those stored tokens available. Missing, malformed, or partially granted permissions produce concrete reconnect guidance. On refresh, an omitted scope retains only the previously confirmed grant, as specified by [OAuth 2.0](https://www.rfc-editor.org/rfc/rfc6749#section-6); an explicitly malformed or partial scope is rejected.

Google's external **Testing** mode expires refresh tokens after seven days for these Classroom scopes. Reconnect when the testing grant expires; successful short-term testing does not prove a production connection. See [Google's refresh token guidance](https://developers.google.com/identity/protocols/oauth2#expiration).

An external OAuth application using these scopes must complete Google's applicable verification requirements before public distribution. A user-supplied OAuth client makes the current package suitable for development and institution-approved installations; a public release still needs a stable approved client and a successful live test.

## Develop

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run dev
```

All API resource requests are GET requests. The extension does not read browser cookies, reuse unrelated Google connector tokens, or persist course data. Errors deliberately omit raw provider response bodies. Assignment loading follows every page and limits concurrent course requests to four; courses that deny access appear as explicit warnings rather than disappearing silently.

## Documentation

- [Classroom scopes](https://developers.google.com/workspace/classroom/guides/auth)
- [List courses](https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list)
- [List coursework](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/list)
- [Raycast OAuth](https://developers.raycast.com/api-reference/oauth)
