<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="Network Hogs" width="100"/>
    <h3>Network Hogs</h3>
    <p>Find which apps are using your network</p>
    <br/>
    <br/>
</div>

Network Hogs is a Raycast extension that shows live per-app download and upload rates, charts recent traffic, and lets you quit bandwidth hogs without leaving your keyboard.

## Commands

- **Network Hogs** shows apps ranked by combined traffic, with Download and Upload sort options. Select an app for its SVG traffic chart, observed session usage, and process IDs. Updates every two seconds.
- **Top Network App** shows the busiest app in your menu bar when it exceeds your threshold. Its menu lists the top five apps and offers a polite Quit action. Raycast refreshes it once a minute by default. Change the refresh interval in Raycast's command preferences, down to ten seconds.

Quiet apps use less than 1 KB/s and are collapsed by default. Press **⌘ ⇧ K** to show them, or search for an app or PID. **⌘ ⇧ P** pauses or resumes monitoring. **⌘ ⇧ C** copies a top-five summary. **⌘ ⇧ Q** asks the selected app to quit. Force Quit is in the action menu and requires confirmation. Unsaved changes may be lost when force quitting.

Press **⌘ ⇧ D** to switch between charts and a full-width list with download, upload, and session totals in every row. With charts open, each row shows the rate for your selected sort order.

Rates update in place. Row order stays stable while you read, and an app stays visible if its traffic becomes quiet. Press **⌘ R** to sort by the latest usage and collapse quiet apps again, or choose a different sort option. The selected app stays selected. Charts use a fixed two-minute window so earlier samples move steadily instead of stretching across the pane. New samples slide into place over 200 ms, with dots marking the latest download and upload values. Turn off **Chart Animation** in Extension Preferences for instant updates.

The action menu also opens Activity Monitor and reveals an app in Finder. Activity Monitor opens normally; the extension does not control its search or selection. System processes, shared services, and Raycast itself have no quit actions.

## Preferences

Choose byte or bit rates, set the menu-bar threshold in KB/s, include upload in the menu-bar title, or show system daemons and shared services. Rates use decimal units: 1 MB/s is 1,000,000 bytes/s or 8 Mbps. Session totals always use bytes.

## AI

Ask `@network-hogs` which apps are uploading or downloading. The read-only `get-network-usage` tool takes a fresh one-second sample. It returns bytes per second, observed byte totals, and PIDs. Its totals cover that sample only; they do not share the interactive command's session. Quit actions are available only in the UI.

Sampling runs locally and makes no network requests. Using the AI tool provides its results to Raycast AI as part of your conversation.

## What the numbers mean

- Helpers inside an app bundle roll up into the outer app. Command-line children can roll up through their parent process. Names come from Raycast's application catalog, with bundle filenames as a fallback.
- A process's first observation establishes a baseline. This avoids reporting its lifetime traffic as a current spike. An app that just started may take another sample to show a rate.
- Session totals include observed traffic while the command is running. Closing the command resets them. Pausing stops sampling and excludes traffic during the pause. Charts retain up to two minutes and restart after a pause.
- Exited apps keep their session totals and lose their quit actions. Sorting again collapses them with other quiet apps unless selected.
- Shared WebKit networking and background downloads cannot reliably be assigned to one app. They use explicit shared-service labels and are hidden by the system-daemon preference by default.
- VPNs and network filters can carry traffic for other apps. Their counters can overlap with app counters. The shown sum is not an exact measure of internet usage or connection speed; local network traffic may also be included.
- Sampling can miss short-lived connections or processes between observations. Counter resets establish a new baseline. These totals are useful for diagnosis, not metered billing.

## Implementation

Requires macOS. No account, sudo, network extension, native dependency, or persistent monitoring service is needed.

The live command runs `nettop -n -P -x -L 0 -s 2 -J bytes_in,bytes_out` through macOS's `script` utility. The pseudo-terminal prevents stdio buffering from delaying updates. Both processes belong to one isolated process group, stopped together when the command pauses or unmounts. The menu bar and AI tool request two samples a second apart and exit.

Counters are parsed by header name and differenced using elapsed monotonic time. The initial cumulative sample is discarded. PID plus process launch time identifies each baseline; new PIDs and reset counters cannot become lifetime-rate spikes. One `ps` call per sample supplies executable paths, parents, users, and launch times.

The detail pane embeds generated SVG in Markdown, following the approach in [In the Timezone PR #32129](https://github.com/raycast/extensions/pull/32129). Translucent sparkline fills, endpoint markers, and explicit image sizing draw on [SVG Showcase for Raycast](https://github.com/luarmr/svg-showcase-for-raycast), particularly its [chart generators](https://github.com/luarmr/svg-showcase-for-raycast/blob/main/src/art.ts) and [SVG helpers](https://github.com/luarmr/svg-showcase-for-raycast/blob/main/src/svg-kit.ts). Colors follow Raycast's light or dark appearance.

Each sample produces one SVG. A single native SVG translation slides the measured history left over 200 ms, clipped to the plot, while the endpoint markers move to the new values. There is no animation timer in React and no traffic prediction between samples. Paused charts and charts with animation disabled remain static. Numeric rates and process details remain available as native list text and Markdown.

Image width and height are both specified to reserve the chart's space during loading. Raycast 2.8.0.0 still clears the displayed image while a replacement loads, which can make live SVGs flash. The image loader in Raycast Internal 2.9.0.30 retains the previous image until its replacement is ready. These installed builds were checked directly; SVG transitions alone cannot fix the older loader's blank frame.

## Development and validation

```sh
npm install
npm run dev
npm test
npm run test:live
npm run lint
npx tsc --noEmit
npm run build
npx ray evals
```

`test:live` measures the first real sample, compares a controlled loopback download against its expected rate, and checks that twenty start/stop cycles leave no sampler processes. It does not quit user apps or contact external hosts. The CSV fixture is a three-process subset captured on macOS 27.0.1; PIDs are anonymized. Other CSV layouts in tests are synthetic, not evidence of compatibility with another OS release.

Before release, verify on macOS 15 and 26, compare controlled browser/sync transfers with Activity Monitor, exercise both quit actions on a disposable app, and measure menu-bar CPU over an hour. Those checks require the corresponding systems and workloads.
