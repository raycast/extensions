# Implement Google Meet Reliability and PWA Support

Work on the Raycast extension located at:

`extensions/google-meet`

Repository:

`raycast/extensions`

## Objective

Fix the Google Meet extension’s unreliable meeting-link detection and add optional support for opening meetings in the installed Google Meet PWA.

The implementation must address these issues:

* `#29457` — Arc Air Traffic Control opens Google Meet in a Little Arc window, but the extension cannot copy the generated meeting link.
* `#27318` — Google Chrome repeatedly creates the meeting but fails to copy its URL.
* `#27073` — Meeting URL is not copied.
* `#25543` — Safari creates the meeting successfully but reports “Couldn't copy to clipboard.”
* `#25588` — Add an option to open Google Meet links in the installed Google Meet PWA.

Treat `#29457`, `#27318`, `#27073`, and `#25543` as variants of the same underlying reliability problem rather than separate browser-specific patches.

## Current architecture

The extension currently:

1. Opens `https://meet.google.com/new`.
2. Waits for a configurable fixed timeout, defaulting to 500 ms.
3. Detects the frontmost browser.
4. Reads the active tab URL through browser-specific AppleScript.
5. Recursively retries while the URL still contains `/new`.
6. Copies the detected URL.

Relevant files include:

* `src/helpers.ts`
* `src/utils/scripts.ts`
* `src/default-profile.ts`
* `src/default-profile-and-refocus.ts`
* `src/components/ProfileList/ProfileList.tsx`
* `package.json`
* `CHANGELOG.md`

The extension exposes four commands, and all four meeting-creation paths must use the same shared implementation. The manifest currently also contains browser and timeout preferences.

## Problems to fix

### 1. Fixed-delay URL detection

The extension waits once before checking the URL. A single 500 ms delay is not reliable across:

* slower connections;
* Google authentication redirects;
* Safari;
* Chrome;
* Arc;
* Little Arc;
* PWA launch;
* machines under load.

Do not solve this merely by increasing the default timeout.

### 2. Unbounded recursive polling

`getMeetTab()` recursively calls itself while the URL contains `/new`, without:

* a delay between attempts;
* a maximum attempt count;
* an overall deadline;
* cancellation;
* validation that a URL was found.

Replace this with bounded polling.

### 3. Unsafe `undefined` handling

The current implementation casts a possibly missing result to `string`.

Never return `undefined as string`.

Return a validated URL or throw a typed/actionable error.

### 4. Frontmost-window assumptions

Opening the URL does not guarantee that the resulting meeting is:

* in the active tab;
* in the front window;
* in the browser initially selected;
* exposed through the standard AppleScript browser API.

This is especially relevant to Arc Air Traffic Control and Little Arc.

### 5. Browser-specific AppleScript failures

Safari and Chromium-family browsers may expose tabs and windows differently depending on browser state.

A browser may have:

* no front window;
* multiple windows;
* a popup or utility window;
* a newly created background tab;
* an authentication redirect;
* a Little Arc window.

The implementation should search relevant windows and tabs rather than only checking one active tab where the browser supports doing so.

### 6. Misleading error reporting

A broad `catch` currently turns every failure into a clipboard error.

Distinguish at least:

* application launch failure;
* unsupported application;
* missing automation/accessibility permission;
* meeting URL timeout;
* URL-reading failure;
* clipboard failure;
* PWA unavailable;
* refocus failure.

A failure after the link has already been copied must not be reported as a clipboard failure.

## Implementation plan

### Phase 1: Centralize meeting creation

Create one shared orchestration function, for example:

```ts
type CreateMeetingOptions = {
  profile?: string;
  refocus?: boolean;
};

type CreateMeetingResult = {
  url: string;
  target: "browser" | "pwa";
};

async function createMeeting(options: CreateMeetingOptions): Promise<CreateMeetingResult>
```

All four commands must call this shared function.

It should own:

1. determining the configured launch target;
2. opening the Google Meet creation URL;
3. waiting for the generated meeting URL;
4. normalizing the URL;
5. copying it to the clipboard;
6. showing success or failure feedback;
7. optionally refocusing the previous app.

Do not duplicate polling or clipboard logic across command files.

### Phase 2: Add explicit launch-target preferences

Add a preference such as:

```json
{
  "name": "launchTarget",
  "title": "Open Meetings In",
  "type": "dropdown",
  "required": true,
  "default": "browser",
  "data": [
    {
      "title": "Preferred Browser",
      "value": "browser"
    },
    {
      "title": "Google Meet PWA",
      "value": "pwa"
    }
  ]
}
```

Keep the existing preferred-browser setting for browser mode.

Expected behavior:

* `browser`: use the selected preferred browser or system default.
* `pwa`: open the installed Google Meet PWA.
* If PWA mode is selected but the application cannot be found, show an actionable failure message rather than silently falling back.
* Do not hard-code a single assumed application path without checking installation behavior.
* Keep all launch-target logic in one helper or module.

Investigate the actual macOS application identity of the Google Meet PWA before implementing detection. Account for the possibility that Chromium-installed PWAs may have generated bundle identifiers or paths.

### Phase 3: Replace recursive URL lookup with bounded polling

Implement a polling utility similar to:

```ts
type PollOptions = {
  timeoutMs: number;
  intervalMs: number;
};

async function waitForMeetingUrl(options: PollOptions): Promise<string>
```

Requirements:

* Poll at a reasonable interval, such as 200–500 ms.
* Enforce an overall deadline.
* Avoid recursive calls.
* Validate every candidate URL.
* Stop immediately when a valid generated meeting URL is found.
* Throw a dedicated timeout error when the deadline expires.
* Avoid tight loops and unnecessary repeated AppleScript process launches.

The existing timeout preference can be reinterpreted as an overall URL-detection timeout, or replaced with a clearer preference. Do not continue treating it as only an initial fixed sleep.

Use a safe default of several seconds rather than 500 ms.

Validate the user-provided value and enforce sensible minimum and maximum bounds.

### Phase 4: Introduce proper meeting URL validation

Create a helper such as:

```ts
function normalizeMeetingUrl(value: string): string | undefined
```

It should:

1. trim whitespace;
2. parse the value with `URL`;
3. require HTTPS;
4. require the expected Google Meet hostname;
5. reject `/new`;
6. identify a generated meeting code path;
7. remove unnecessary query parameters where appropriate;
8. return the canonical shareable URL.

Do not accept an arbitrary URL merely because it contains the text `meet.google.com`.

Support legitimate generated Meet URL forms discovered during implementation, but keep validation narrow enough to avoid copying unrelated Google Meet pages.

### Phase 5: Improve browser URL discovery

Replace the assumption that only the active tab of the front window needs inspection.

Implement browser adapters or equivalent isolated functions:

```ts
interface MeetingUrlSource {
  getCandidateUrls(): Promise<string[]>;
}
```

Provide appropriate implementations for:

* Safari;
* Chrome and Chromium-family browsers;
* Arc and Dia;
* Firefox-family browsers;
* Google Meet PWA, where technically possible.

For scriptable browsers:

* inspect URLs from all relevant windows and tabs;
* prioritize the frontmost or most recently opened window;
* tolerate windows without tabs;
* return an array of candidates rather than a comma-concatenated string;
* avoid parsing AppleScript output with a plain `.split(",")`, because URLs or returned data can make delimiter-based parsing fragile.

Prefer structured output, such as JSON emitted by the script, or use a delimiter that is explicitly encoded and safely parsed.

#### Safari

Ensure the AppleScript handles:

* no open windows;
* multiple windows;
* the newly opened tab not yet being active;
* temporary `/new` and authentication URLs.

#### Chrome and Chromium browsers

Search all tabs in all normal windows, or otherwise identify the tab opened by this command.

Do not depend solely on the currently active tab.

#### Arc and Little Arc

The solution must work when Arc Air Traffic Control routes `meet.google.com` into Little Arc.

Investigate how Little Arc appears through:

* Arc’s AppleScript dictionary;
* Arc window enumeration;
* System Events;
* process names and bundle identifiers.

Do not assume the front window has the same shape as a normal Arc window.

Where possible, enumerate Arc windows/tabs and detect the generated Meet URL. If Little Arc does not expose URLs through Arc’s scripting interface, implement a safe fallback and return a specific unsupported-detection error rather than claiming clipboard failure.

#### Firefox

The current implementation uses simulated keyboard input and reads `pbpaste`.

Preserve the user’s previous clipboard contents when using this fallback:

1. read and retain the existing clipboard value;
2. copy the address-bar URL;
3. read the candidate;
4. restore the previous clipboard contents if meeting creation ultimately fails;
5. replace it only with the final Meet URL on success.

Do not require this keyboard-based fallback for browsers that support direct scripting.

### Phase 6: Handle PWA meeting URL retrieval

Opening the PWA is only half of issue `#25588`; commands still promise to copy the meeting link.

Determine which of these approaches is technically viable:

#### Preferred approach

Launch the PWA and retrieve its active meeting URL through its application/window/browser host APIs.

#### Alternative approach

Create or resolve the meeting URL in a browser-compatible context first, copy it, and then launch that resolved URL in the PWA.

#### Last-resort behavior

If the PWA can open a meeting but macOS does not expose the resulting URL, clearly document and represent that limitation in the UI.

Do not report success unless:

* a validated meeting URL was copied; or
* the product behavior was intentionally changed and the command copy explicitly reflects that change.

Do not use arbitrary delays followed by UI scripting unless there is no stable alternative.

### Phase 7: Add typed errors

Define errors or error codes such as:

```ts
type MeetErrorCode =
  | "APP_NOT_FOUND"
  | "APP_LAUNCH_FAILED"
  | "UNSUPPORTED_BROWSER"
  | "URL_READ_PERMISSION_DENIED"
  | "URL_READ_FAILED"
  | "MEETING_URL_TIMEOUT"
  | "INVALID_MEETING_URL"
  | "CLIPBOARD_WRITE_FAILED"
  | "PWA_NOT_INSTALLED";
```

Map them to concise user-facing messages.

Include useful recovery instructions where applicable:

* choose a supported browser;
* increase the detection timeout;
* grant Automation permission;
* grant Accessibility permission for keyboard-driven Firefox support;
* install the Google Meet PWA;
* switch launch target back to Browser.

Do not expose raw AppleScript errors as the main message, but preserve them for development logging.

### Phase 8: Make refocus best-effort

For both refocus commands:

1. complete URL discovery;
2. copy the link;
3. show success;
4. attempt refocus separately.

A refocus failure must not replace a successful result with a meeting-creation failure.

Apply this consistently to:

* default profile and refocus;
* specified profile and refocus.

### Phase 9: Add automated tests

Move testable logic out of Raycast command entrypoints.

At minimum, test:

#### URL normalization

* generated Meet URL is accepted;
* `/new` is rejected;
* unrelated Google Meet pages are rejected;
* non-Google hosts are rejected;
* query parameters are normalized correctly;
* whitespace is removed;
* malformed URLs are rejected.

#### Polling

* resolves when a valid URL appears after multiple attempts;
* times out predictably;
* does not recurse indefinitely;
* ignores invalid candidates;
* stops polling after success;
* uses configured interval/deadline correctly.

#### Candidate selection

* selects generated URL over `/new`;
* searches multiple windows/tabs;
* handles an empty candidate set;
* handles duplicate URLs;
* prefers the most likely recently created meeting where ordering metadata is available.

#### Preferences

* invalid timeout input falls back safely;
* values below or above bounds are clamped or rejected;
* browser and PWA launch targets route correctly.

Mock Raycast APIs and AppleScript boundaries rather than executing real browser automation in unit tests.

### Phase 10: Manual verification matrix

Manually test every relevant command:

* Create Meet
* Create Meet and Refocus
* Create Meet with Specified Profile
* Create Meet and Refocus with Specified Profile

Test at least:

| Target          | Scenario                          |
| --------------- | --------------------------------- |
| Safari          | Default browser                   |
| Chrome          | Default browser                   |
| Chrome          | Preferred browser override        |
| Arc             | Normal Arc tab                    |
| Arc             | Air Traffic Control to Little Arc |
| Dia             | Standard window                   |
| Firefox         | Accessibility permission granted  |
| Firefox         | Accessibility permission missing  |
| Google Meet PWA | Installed and selected            |
| Google Meet PWA | Selected but not installed        |

Also test:

* browser already running;
* browser closed before command;
* no browser window initially open;
* slow meeting creation;
* Google authentication redirect;
* multiple existing Meet tabs;
* clipboard containing text before execution;
* invalid timeout preference;
* refocus permission failure.

## Expected file organization

Use judgment based on the existing project, but aim for a separation similar to:

```text
src/
  commands or existing entrypoints
  services/
    create-meeting.ts
    meeting-url-poller.ts
    launch-target.ts
  browser-adapters/
    safari.ts
    chromium.ts
    arc.ts
    firefox.ts
    pwa.ts
  utils/
    meeting-url.ts
    scripts.ts
  errors.ts
```

Do not restructure unrelated profile-management code unnecessarily.

## Constraints

* Keep the extension macOS-only unless the entire implementation is made cross-platform.
* Do not add a remote service or require a Google API key.
* Do not use undocumented Google APIs to reserve meetings.
* Do not introduce browser-specific hacks into command entrypoints.
* Avoid adding dependencies when native APIs and small utilities are sufficient.
* Preserve existing profile-selection behavior.
* Preserve the four existing commands.
* Keep backward-compatible preferences where practical.
* Run formatting, linting, type-checking, and build validation.
* Update `CHANGELOG.md`.
* Add the contributor when required by repository guidelines.

## Acceptance criteria

The work is complete only when:

1. All four commands use one shared creation pipeline.
2. URL polling has an interval and a hard deadline.
3. No function casts an absent meeting URL to `string`.
4. Safari can create and copy a meeting link.
5. Chrome can repeatedly create and copy meeting links.
6. Arc works in a normal window.
7. Arc’s Little Arc behavior is either supported or produces a precise, non-clipboard-specific error with the technical limitation documented.
8. PWA launch is available as an explicit preference.
9. Selecting an unavailable PWA produces an actionable error.
10. A successful clipboard write is not later reported as failed because refocus failed.
11. Meeting URLs are validated and normalized before copying.
12. Automated tests cover URL parsing and polling.
13. Existing profile commands continue to work.
14. `npm run lint` passes.
15. `npm run build` passes.

## Implementation workflow

Before editing:

1. Read all files under `extensions/google-meet`.
2. Inspect the complete discussions and any linked pull requests for the five issues.
3. Verify whether recent changes on `main` already partially addressed browser detection.
4. Reproduce or reason through each browser path from the current code.
5. Write a brief root-cause summary.

Then:

1. implement the shared architecture;
2. add tests;
3. run lint and build;
4. manually verify the browser matrix where possible;
5. report anything that could not be tested.

## Final response format

Return:

### Root cause

Explain why the existing implementation fails across Safari, Chrome, Arc/Little Arc, and potentially the PWA.

### Changes made

List changes grouped by file.

### Browser behavior

Describe the final implementation for each supported browser and the PWA.

### Tests

List automated and manual tests performed.

### Validation

Report the exact results of:

```bash
npm run lint
npm run build
```

### Remaining limitations

State any browser or PWA limitations honestly.

### Issues addressed

Explicitly map the implementation back to:

* `#29457`
* `#27318`
* `#27073`
* `#25588`
* `#25543`