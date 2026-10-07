# Verification

Run `npm test`, `npx tsc --noEmit`, `npm run build`, and `npm run lint`.

The regression tests execute the extension's TypeScript modules with isolated in-memory storage and controlled clocks. They cover independent command writers, legacy settings, malformed data, failed saves, selection fallbacks, form submissions, calendar boundaries, and platform guards. They do not read or change Raycast's real saved progress.

For native macOS and Windows checks:

1. Start `npm run dev` and open the development **X in Progress** command.
2. Check that built-in periods have pin and details actions, but no delete action.
3. Open **Add New Progress**. Check that its end date is one calendar day after its start date. Clear a date or choose an end date before the start date. Submission should show an error and keep the form open.
4. Create a custom range in a disposable development profile. Pin it, select it for the **Progress** subtitle, and restart the command. The range, pin, and selection should survive.
5. Edit the selected range and uncheck **Show in Command Subtitle**. The **Progress** subtitle should return to the year immediately. Deleting that custom range should also leave a valid year selection.
6. Keep the list open across a percentage change or midnight. Values and period dates should refresh within a minute.
7. On macOS, hide all menu-bar items, then add a visible custom range. The menu bar should show a visible item. Changing its selection must not remove a newly created range or revert a pin.
8. On Windows, check that menu-bar actions and visibility controls are absent. The progress label, forms, clipboard action, and subtitle commands should work.
9. Run **Year in Progress**, add it to Favorites, and check that its progress bar and percentage appear in root search. Selecting a custom range for **Progress** must not change this dedicated year command.
10. Open **X in Progress**, then return to root search. Its subtitle should show the year by default. Choose a different period using **Show in Command Subtitle**, then return to root search. Both **X in Progress** and **Progress** should show that period. The normal list command's subtitle refreshes while open and on reopening.
11. Open the **Command Progress** dropdown at the top of **X in Progress**. Check Year, Quarter, Month, Week, Day, and any custom ranges. In a disposable development profile, choose Quarter, then return to root search and reopen the list. Both normal command subtitles should show Quarter and the dropdown should retain it. Choosing a period should keep every list entry visible.

Native Windows verification requires a Windows machine with Raycast. A passing mock platform test alone does not verify its UI.
