<div align="center">
    <br/>
    <br/>
    <img src="./assets/icon.png" alt="Year in Progress" width="100"/>
    <h3>Year in Progress</h3>
    <p>Track the progress of the year, quarter, month, week, day, or a custom date range</p>
    <br/>
    <br/>
</div>

Year in Progress is a Raycast extension that shows how far you are through the year, quarter, month, week, day, or a custom date range, and keeps that progress visible in command subtitles and the menu bar so you can check it whenever you open Raycast.

To keep the year's progress visible whenever you open Raycast:

1. Run **Year in Progress** once to populate its subtitle and activate background refresh.
2. Select the command in Raycast, open its Actions menu, and choose **Add to Favorites**.

The command shows a progress bar and percentage in its subtitle and refreshes every four hours while background refresh is enabled. Run it again for an immediate update.

Use **X in Progress** to manage custom date ranges and choose the period shown by the existing **Progress** command. The dedicated **Year in Progress** command always shows the year, regardless of that selection.

Use the **Command Progress** dropdown at the top of **X in Progress** to choose Year, Quarter, Month, Week, Day, or one of your custom ranges. Your choice is saved and controls the subtitles of both **X in Progress** and **Progress**. The dropdown changes the displayed period while keeping all progress entries in the list.

**X in Progress** also shows the selected period's progress in its root-search subtitle. Open it once to populate the subtitle, then add it to Favorites if you want quick access to the list. It defaults to the year and uses the same **Show in Command Subtitle** selection as **Progress**. The subtitle updates when the list opens and while it stays open; Raycast does not schedule background refresh for view commands.

**Show X in Progress in Menu Bar** and menu-bar controls are available on macOS only.

Progress values refresh every minute while the list is open. Custom ranges start with an end date one day after the start date. Built-in periods can be pinned or hidden from the menu bar. Custom ranges can also be edited and deleted.

Existing custom ranges, pins, and selections are preserved when upgrading. If saved data cannot be loaded, the extension reports the problem and preserves the original data for recovery.

The year percentage counts the current calendar day. Other periods measure elapsed time through the start of the next period.
