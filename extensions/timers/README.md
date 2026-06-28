# Timers for Raycast

[Link to the original repo](https://github.com/ThatNerdSquared/timers-for-raycast)

This is a lightweight extension allowing you to start and stop countdown timers, stopwatches, and alarms. It works directly in Raycast, no external apps or dependencies required. Now available in the Raycast Store!

<a id="install-extension-button" title="Install Timers Raycast Extension" href="https://www.raycast.com/ThatNerd/timers#install">
        <img height="64" style="height: 64px" src="https://assets.raycast.com/ThatNerd/timers/install_button@2x.png">
</a>

If you enjoy using Timers for Raycast and/or want to support further development, feel free to donate below!

<a href="https://www.buymeacoffee.com/nathanyeung" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Commands

_Note: if you do not receive notifications from the timer completion, you may need to allow Script Editor notifications in your Focus settings._

- [x] Start Timer (2, 5, 10, 15, 25, 30, 45, 60, and 90 minute variations)
- [x] Start Custom Timer (allows you to set a custom countdown and optionally save it for future use)
- [x] Manage Timers (view/rename/start/stop running or preset countdown timers)
- [x] Start Stopwatch
- [x] Manage Stopwatches (view/start/stop running stopwatches)
- [x] Dismiss Ringing Timer (stop a ringing alert for a finished timer, if you've checked the Ring Continously setting)
- [x] Preview Alert Sounds (test out the bundled timer alert sounds before selecting one in settings)
- [x] Stop Running Timer (stop the running timer closest to completion)

### Not Yet Implemented

- [ ] Set Alarm
- [ ] Manage Alarms (view/start/stop running alarms)

## Contributing

If you'd like to file an issue, make a feature request, or improve the code in this extension, feel free to open an issue or PR! Here are a few pieces of advice:

- Please check my [personal repo for this extension](https://github.com/ThatNerdSquared/timers-for-raycast) first as I may already be working on a fix, or there may already be an issue/PR for your idea ;) I am also more reachable there for PRs/issues.
- If you decide to file an issue on the main `raycast/extensions` repo, please ping me (`@ThatNerdSquared`) so that I don't miss your request!
- Feel free to reach out to me on the Raycast Slack (`@ThatNerd(Squared)`) if I have not responded to you in a timely manner.
- `src/hooks/useTimers.ts` contains the custom React hook that I use for state management across various commands, and `timerUtils.ts` contains backend functions I use to create the actual timer files.
- Custom timers are saved in a `customTimers.json` file as an array of [`CustomTimers`](https://github.com/ThatNerdSquared/timers-for-raycast/blob/3ea18a109a357ade47a2f854883e21c1680f497b/src/types.ts#L16), and running timers are stored as text files where the filename is `[date and time started, with illegal characters replaced with __]---[length of timer in seconds]` and the file content is a single line with the name of the timer.
- If you submit changes, please update these contributing guidelines as necessary to prevent confusion :)

## Acknowledgements

Sound effects procured royalty-free from [Mixkit](https://mixkit.co/free-sound-effects/alerts/).
