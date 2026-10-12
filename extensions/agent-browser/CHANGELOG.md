# Agent Browser Changelog

## [Manage Sessions] - {PR_MERGE_DATE}

- List active CLI sessions, including Raycast profile sessions in their own socket directories.
- Open a URL in a selected session and close sessions after confirmation.
- Handle empty lists, stale sessions, partial failures, cancellation, and CLI timeouts without displaying raw browser output.
- Add isolated session-management regression tests and document CLI and native-browser limitations.

## [Initial Version] - 2026-08-31

- Open links in a visible browser session directly from Raycast.
- Use Raycast AI to open, view, control, and close browser sessions.
- Keep sessions isolated, with safeguards for browser actions and page content.
- See AI browser sessions by default, or choose headless mode in preferences.
- Enter text reliably and wait for pages to finish updating after actions.
- Use installed Chromium-based browsers and their existing profiles.
- Open and control live tabs in Dia, including page previews and interactions.
- Get clear guidance when Dia needs a one-time restart before automation is ready.
- Open and close tabs in your active Safari profile.
- Improved browser and profile detection, including fixes for Dia, Safari, Chrome profiles, and Raycast’s background environment.
