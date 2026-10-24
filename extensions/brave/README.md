# Brave Extension

- Open a new tab, window, or incognito window immediately with no-view commands
- Search and jump to currently open tabs in Brave Browser
- Search and open Brave tabs from search query based on browser history across all profiles.
- Search and open Brave tabs from search query based on bookmarks across all profiles.

*Note*:

Open profile support is limited to opening tab in new profile window. You can customize default tab opening behaviour in settings.

If you are using `Default` mode and have multiple profiles open in parallel, the tab will open in the topmost window.

These are due to limitations in the Brave Browser API.
## Windows

Supports Brave, Brave Beta, and Brave Nightly. New tabs, windows, incognito windows, bookmarks, bookmark folders, history, and profiles use the selected channel. Custom installations can set the executable and User Data directory in preferences. Launches pin the same User Data directory used for reading, including when Raycast overrides LOCALAPPDATA.

Install the [Raycast browser extension](https://raycast.com/browser-extension) in Brave to list tabs. The API returns tabs from all connected browsers without identifying their source; the list can include other browsers. Switching matches a title in the selected Brave installation (duplicate titles are ambiguous), and reports a copyable error if the existing tab cannot be selected; it never opens a duplicate as a fallback. Some internal and local pages may be absent from the browser extension's results. Without browser-extension access, creating tabs and searching history/bookmarks still work.

Moving existing tabs to another window, running bookmarklets, and extracting page favicons through Apple Events are macOS only. Bookmarklet code can still be copied on Windows.

## Development

Windows builds use the [official Raycast Rust bridge](https://github.com/raycast/extensions-rust-tools). Install Rust with the MSVC toolchain and Visual Studio C++ build tools, then run `npm install` and `npm run build`. Tab switching and new-tab keyboard actions run in the compiled helper.

Run `cargo test --manifest-path rust/Cargo.toml` for the helper tests. The ignored live window test additionally requires a running Brave window and `RAYCAST_BRAVE_EXE` set to its executable path; it temporarily tests window show states and restores the original placement.
