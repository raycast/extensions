# Dock Tinker

Custom hidden preferences of Dock.
Backup, restore and reset Dock state.

**Have you ever unintentionally messed up the state of your Dock?** At least this happens to me a lot, especially when uninstalling apps, hate it

- Use the **Backup Dock State** and **Restore Dock State** commands of this extension to backup the Dock state, even after Dock is accidentally restored to the initial state, you can still restore the backup state quickly.

**This extension enables some hidden Dock preferences:**

- Add Spacer to Dock: Add movable spacing between icons on the Dock.
- Toggle Auto Hide: The dock will automatically show and hide.
- Toggle Auto Hide Delay: Disable Dock auto-hide time delay.
- Toggle Dock Orientation: Set the orientation of the Dock, including Left, Bottom, Right
- Toggle Minimal Effect: Set the effects when the application is minimized, including Suck, Genie, Scale.
- Toggle scroll to open: Allows you to use the scroll up gesture to open the stack or use the same gesture on a running application to display all windows associated with that application (also known as Exposé).
- Toggle Show Hidden: The icon of apps with hidden window on the Dock will be dimmed.
- Toggle Single App: When you click on an app on the Dock, the window of that app will be displayed at the top and all other apps will be hidden at the same time.
- Toggle Static Only: The Dock will only show the icon of the currently running application.

**🌟🌟Tips**: Some hints about these commands

- Add Spacer to Dock
  - Spacer can be dragged and dropped to move its position or removed
- Toggle Minimal Effect
  - mineffect includes three kinds: Suck, Genie, Scale, where Genie and Scale can be set in the system settings, Suck is a hidden function and can only be set by command.
- Toggle Show Hidden
  - Window status is divided into 4 types: no window, hidden window, full-screen window, minimized window, where no window, hidden window and full-screen window app will become translucent icons.
- Toggle Single App
  - single-app mode only hides other applications when you click on them from the Dock, other ways to open the window will not hide the application.
    For example, if you use the Switch Windows command or "⌘+Tab"to bring up a window, it will not hide other applications, so you can use this trick to open multiple windows in single-app mode.
- Toggle Static Only
  - This command will make the Dock keep only running apps, Finder, Trash, (The Launchpad will also be removed).
  - So please use this command with caution, but don't worry too much, you can use **Backup/Store Dock State** command to backup and restore the dock state, or use **Reset Dock State** command to reset the dock to the initial state.

**🌟🌟Recommendation**: Toggle Show Hidden and Toggle Single App work better together
