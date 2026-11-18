# Tethered for Raycast

Control [Tethered](https://tetheredmac.com/) directly from Raycast. Tethered must be installed and running. A number of actions are only available to users with Pro access.

## Commands

- Open the Tethered website to download the Mac app.
- Choose Auto, Low, or High Power mode.
- Start or stop Caffeinate, or search your saved Caffeinate presets.
- Start a timed Caffeinate session by entering a duration from 1 to 1,440 minutes.
- Search and apply your saved Tethered profiles.
- Create one-time scheduled events or weekly repeating events on selected weekdays.
- Enable or disable Topup, Sailing, and Heat Protection.
- Start or cancel a manual battery calibration cycle.
- Show the current battery and control status.
- Toggle the MCP bridge on or off. Disabling it ends the active task session.
- Open Tethered Pro checkout from its own Raycast command.

Saved profiles and Caffeinate presets are read from Tethered's local preferences. Some actions require an unlocked Tethered feature or suitable battery conditions. High Power requires a supported Mac. Topup requires AC power and active charging control. Calibration can charge to full and then discharge the battery.

## Setup

Run **Get Tethered** to use the same download link as the Tethered website. Install and open the current Tethered app, then use the extension's controls. Search for **Tethered** in Raycast to find its commands. You can assign aliases or hotkeys in Raycast's Extensions settings.

The extension sends requests to the running Tethered app. If **Show Status** cannot get a fresh response, check that Tethered is running and updated. Control commands wait for a matching app response and show its result or rejection reason. A timeout is not a confirmed failure; check the app before retrying. These acknowledgments require the updated Tethered app. Success confirms the app setting or accepted operation, not completion of asynchronous hardware changes.

**Get Tethered Pro** requires the updated Tethered app to be running and an account signed in. It opens Tethered's checkout in your browser; payment and license activation remain handled by Tethered.

## Scheduled and repeating events

Use **Create Scheduled Event** to choose an action and a future date/time, or **Create Repeating Event** to choose weekdays and a local time in 24-hour HH:MM format.

Both commands support Sleep, Wake, Shut Down, Power On, Wake or Power On, Low/Auto/High Power, Topup on/off, Caffeinate start/stop, Brightness, and Fans. Brightness and Fans offer System or a fixed percentage. Supported actions offer an optional duration in minutes; Topup offers an optional wait for AC power. Existing Pro and hardware requirements still apply.

Tethered confirms that the event was saved before the extension reports success. Both the app and extension need this scheduling update. If confirmation times out, check Tethered’s Schedule settings before retrying to avoid adding the event twice.

App actions require Tethered to remain running and the Mac to be awake at the scheduled time. macOS power events use the system scheduler and may prompt for administrator authorization. macOS provides one repeating wake/power-on slot and one repeating sleep/shutdown slot. A conflicting event is rejected unless you select **Replace a conflicting repeating power event**; the other slot is preserved. View, edit, or remove created events in Tethered’s Schedule settings.

## Manage events

Open **Next Event** for upcoming events sorted by their next occurrence, with disabled repeating events in a separate section. Select an event to edit it in the prefilled scheduling form, or delete it. **Save Changes** updates the selected event; it does not add a copy. Edits keep the event’s source (Tethered or macOS) and one-time/repeating type.

Only repeating events have Enable/Disable actions. Disabling an app event stops future occurrences and cancels any pending wait for AC, while an already active duration continues to expire normally. Disabling a macOS repeating event removes it from the system scheduler and keeps its settings locally. Re-enabling rejects conflicts with an occupied power-event slot. Disabled events remain disabled when edited. Tethered’s Repeated Events table exposes the same state through an Enabled toggle.

## Quick Event

Open **Quick Event**, type a supported phrase, and review the live preview. Press Enter to create the previewed event directly, or choose **Edit Details** to adjust it in the form.

- `sleep in 30 minutes`
- `low power weekdays at 9am for 2 hours`
- `wake every Monday and Friday at 8am`
- `brightness 50% tomorrow at 9am for 1 hour`
- `topup on tomorrow at 7am wait for ac 30 minutes`

Schedules support relative minutes/hours/days, today, tomorrow, YYYY-MM-DD dates, upcoming named weekdays, and daily/weekday/weekend/named-day repeats. Times accept 12-hour AM/PM or 24-hour notation and use the Mac’s timezone. Brightness and fans require a percentage or `system`. Durations use `for 2 hours`; Topup can use `wait for ac 30 minutes`. Unsupported or incomplete input displays guidance and cannot create an event. Quick Event never silently replaces an existing repeating power event; use Edit Details to explicitly permit replacement.

The **Next Event** command shows the next enabled upcoming event in its root-search subtitle, using your Mac’s local date and time. It refreshes when opened, after launcher event changes, and approximately every minute when Raycast background refresh is enabled. The subtitle clears when no future events exist or Tethered cannot be reached. Select Next Event to open the list, or use **Manage Events** to open it directly. Raycast controls background scheduling, so changes made inside Tethered can take until the next refresh to appear.

**Toggle MCP Bridge** requires the updated Tethered app to be running. Use **Show Status** to confirm whether the bridge is enabled and inspect its current status.

**Toggle Companion Sync** is reserved for the upcoming feature. The command waits for a matching app acknowledgment. The current app returns an unavailable error; a future supporting app can report success or a specific failure through the same response without another extension update. Older apps that do not respond produce a timeout error.

**Share Profile** lets you pick a saved profile and opens Tethered’s save dialog to export a `.tetheredprofile` file. **Post Profile** opens Tethered’s existing submission editor for the selected profile; review its public details and submit there. Tethered displays the final upload result, including any publication review requirement. Both require Pro access and the updated app; posting also requires signing in. Raycast confirms the handoff, not a completed file export or publication.
