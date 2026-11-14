# GitHub Profile

GitHub Profile displays a GitHub user's profile, contribution calendar, and recently updated repositories in Raycast.

## Setup

1. Create a personal access token in [GitHub Settings](https://github.com/settings/tokens).
2. Set your GitHub username and personal access token in the extension preferences in Raycast. The token is required to fetch the contribution calendar.
3. Run **Show GitHub Profile**.

If GitHub returns an HTTP 401 error, check whether your token has expired or been revoked. You can open **Open Extension Preferences** from the command's Actions menu to replace it.

## Features

- The contribution dashboard appears at the top and adapts to Raycast's light or dark appearance.
- The dashboard summarizes contributions over the past year and the last 30 days. It also shows the current and longest contribution streaks.
- The profile shows a compact biography and follower counts, with optional account details when they are available.
- The main page previews the three most recently updated public repositories with descriptions and activity statistics.
- The **Browse Repositories** action opens a searchable native list of the ten most recently updated public repositories. Each result offers browser links and lets you copy its clone URL.
- The Actions menu provides shortcuts to the user's starred repositories, authored issues, and pull requests.
- The **Show Public Activity Charts** action opens OSS Insight charts with additional public activity and recent work over the last 28 days.
- The **Open GitHub Profile** action opens the profile in your browser.

## Data and Display

The profile, repository list, and contribution calendar use GitHub's APIs. The additional activity charts come from OSS Insight, whose totals and update timing can differ from GitHub's contribution calendar. You can open each chart in your browser by following its link.

The streak statistics come from the daily contribution counts already returned by GitHub. The longest streak covers the returned calendar period. The current streak can continue through yesterday while today's activity is still incomplete. The recent total includes today and the preceding 29 dates. These calculations use calendar dates in UTC.

Each section appears as soon as its data is available. A slow or failed request does not hide the other sections. Each GitHub request has a 15-second deadline, after which the affected section displays an error and can be retried with **⌘R**. Previously loaded data remains visible during a refresh and after a failed refresh. If a refresh fails, the affected section displays an error alongside its cached data.

If the contribution request fails, the view reports the failure instead of displaying zero contributions or generating example data.

Charts use a consistent display width and retain their original aspect ratio. The OSS Insight images load in a separate view when you choose **Show Public Activity Charts**, so the main profile does not depend on third-party image loading.

Press **⌘R** or choose **Refresh Profile** to fetch the profile, repositories, and contribution calendar again. Press **⌘B** to browse the loaded repositories. OSS Insight controls the caching and update timing of its chart images.
