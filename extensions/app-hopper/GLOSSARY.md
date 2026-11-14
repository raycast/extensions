# App Hopper

App Hopper finds running applications, windows and browser tabs on macOS.

## Language

**Application search**:
The root App Hopper list of running applications, windows and browser tabs, together with its query, arrangement and selected target.

**App window evidence**:
The available observations about an application's windows, including their source, target identity and whether their state is known.

**Browser snapshot**:
The browser windows, tabs and counts associated with one observation of that browser's native windows.

**Companion**:
The optional browser extension shared by Firefox and Zen that supplies live background tab information.

**Companion release**:
A versioned companion package with a download location and checksum pinned by App Hopper.

**Native helper**:
A bundled executable built from App Hopper's Swift sources, or its locally compiled equivalent in a source checkout.

**Native browser**:
A browser whose windows and tabs App Hopper reads and focuses through macOS Accessibility, including Chromium and WebKit browsers.

**Retained tab reference**:
A reference to a particular tab in a running native helper session; it expires when that session ends.
