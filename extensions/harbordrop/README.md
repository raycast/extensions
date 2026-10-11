# HarborDrop for Raycast

Search your HarborDrop downloads, follow active transfers, and send a URL to HarborDrop for review from Raycast.

Requires a separately installed, official [HarborDrop](https://vesslo.top/harbordrop) app with Raycast integration support and a valid license or active trial. macOS 14 or later is required by HarborDrop.

Requires HarborDrop **1.4.15 or later**, available from the official app website. This version includes newest-first ordering for shared downloads.

## Setup

1. Open a compatible HarborDrop app and complete its normal setup.
2. Enable **Raycast integration** in HarborDrop Settings. If this setting is absent, that app version cannot connect to this extension.
3. Keep HarborDrop running while using shared download state.
4. Open **Search Downloads** or **Add Download** in Raycast.

The extension checks that the installed app is an official, unmodified HarborDrop copy. If multiple installations are found, resolve the duplicates before trying again. Installing the extension does not install or update HarborDrop.

## Search Downloads

Search by download name and see active transfers before other downloads. Within each section, the most recently added downloads appear first. The view refreshes every two seconds while the list is open.

- See the number of downloading tasks, progress, transferred bytes, total size, and transfer speed.
- Transfers with an unknown total show bytes received. Finalizing files appear in a separate **Finishing** section.
- Use **Show in HarborDrop** to select the matching task in the app.
- Use **Reveal in Finder** for a completed download. HarborDrop checks the file and asks for confirmation before revealing it.

Queued, paused, and finishing tasks are excluded from the downloading count. When only part of a large list is shared, `+` marks a partial count. A **Last Shared** view is read-only and omits transfer speed; open HarborDrop and use **Refresh Shared State** to check its current state.

## Add Download

Enter one HTTP or HTTPS URL, or choose **Use Current Clipboard** to read the current clipboard explicitly. Choose **Review in HarborDrop**, then review the URL and destination in the app. HarborDrop applies its normal download and access checks before starting work.

URLs containing an embedded username or password are not accepted. Downloads that need browser authentication or additional request context should be sent through HarborDrop's browser extension instead.

The request result describes whether HarborDrop handled your request. A successful Add request means a task was added; it does not mean the file has finished downloading. Use **Search Downloads** or HarborDrop to follow the transfer.

To open the app directly, use Raycast's normal application search. An **Open HarborDrop** action is also available inside both commands.

## License and access

An official HarborDrop app with a valid license or active trial can use the integration. The app's existing trial and offline license rules continue to apply; the Raycast extension does not activate, change, or remove your license.

If access expires or needs verification, the extension clears the displayed download list and blocks new actions. Open HarborDrop to check your access, then refresh the command. A connection or verification error does not mean your license was deleted.

## Requests that need attention

Successful and cancelled requests are cleared from local tracking automatically while either command is open. Other requests appear under **Requests to Check**, below the download list, with the action name and its current status. Request identifiers are available in the detail view.

Failed, declined, and expired requests stay visible until you open their result. Requests whose result is unknown or needs reconciliation remain available for checking; missing or unreadable results are never treated as success. Clearing a tracking entry does not remove the download or cancel work in HarborDrop.

If a request times out, its result is **unknown**. Use **Check Same Request** or **Check in HarborDrop** before submitting anything again. The extension does not automatically resend a request.

If HarborDrop restarts while handling a request, you may see a reconciliation message asking you to check its recorded result. Keep using that request's actions until its state is resolved. Closing Raycast stops checking the result; it does not cancel work already accepted by HarborDrop.

## Privacy

The integration exchanges files locally on your Mac. HarborDrop shares download names, task identifiers, status, progress, and access status with the extension. License keys, email addresses, device identifiers, authentication tickets, cookies, and download file paths are not included in the shared download list.

The URL you submit is passed to HarborDrop in a private local request file while it handles the request. URLs are excluded from request result records, app wake links, and extension logs. Raycast stores request identifiers and reconciliation metadata so an unknown result can be checked again. It does not save URL form drafts or scan clipboard history.

The extension does not read HarborDrop's download history database, upload download data, collect analytics, pause or delete downloads, or open downloaded files. HarborDrop owns download creation and file access. This local integration is not a security boundary against other software running as your macOS user.

## Troubleshooting

| Message or situation                                        | What to do                                                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Raycast integration is disabled or missing                  | Open HarborDrop and enable **Raycast integration** in Settings. A compatible app version is required.                           |
| The app needs an update or uses an incompatible integration | Check HarborDrop for a compatible release. The presence of an older integration setting alone does not establish compatibility. |
| Access is checking, expired, or needs verification          | Check access in HarborDrop, then use **Refresh Shared State** or **Check Integration Access**.                                  |
| Shared state is out of date                                 | Keep HarborDrop running and refresh the command.                                                                                |
| Multiple apps or app verification failed                    | Resolve duplicate installations or check the official app's installation and permissions, then retry.                           |
| A completed file cannot be revealed                         | Check its location and access permissions in HarborDrop.                                                                        |
| A request timed out or needs reconciliation                 | Check the same request in HarborDrop before submitting another one.                                                             |

Full Disk Access is not a default requirement. If macOS denies access, check the specific permission involved: Raycast reads the integration files, while HarborDrop accesses download destinations.
