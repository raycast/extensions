
# Memorkeys Documentation

### Overview

Memorkeys is an OSX-specific tool designed to provide a quick reference for your shortcuts in Raycast. It allows you to view all shortcuts in a list and search by application or action and filter by the current app.

## Getting Started

*see setup instruction anytime with ⌘ + H*

1.  **Export Settings:**

	- Open Raycast and navigate to the Advanced tab in the settings.

	- Select 'Export Data' and ensure only the 'Settings' checkbox is ticked.

	- Skip the password creation step when saving the `.rayconfig` file.

2.  **Ingest Config:**

	- Open Memorkeys and press `⌘ + U` to open the config ingest dialog.

	- Add the exported `.rayconfig` file.

	- A new file containing just the hotkeys will be saved in your local app data, accessible with `⌘ + O`.

3.  **Using Memorkeys:**

	- Press `⌘ + H` for the setup guide.

	- Use `⌘ + Return` to filter shortcuts by the current app.
	- Use `↑ or ↓` to select a shortcut and hit `Return` to preform the action

	- If the current app shortcuts do not update correctly, press `⌘ + R` to reload.

	- If you upload a new config file and dont see the new shortcuts, press `⌘ + R` to reload.

	- For more information about a shortcut, press `⌘ + I` to view details, including an ergonomic score.

	- In detail view, press `← or →` to navigate between shortcuts.

4. **Next to the shortcut name is an emoji that indicates its ergonomic score**

	| Symbol | Meaning |
	| :---: | :---: |
	|👋 | one handed operation |
	|👐 | two handed operation |
	|🤮 | rethink your life |


## Limitations

- Some applications may store their names in unconventional ways, causing parsing issues. If this occurs, use `⌘ + O` to open the directory containing the formatted `shortcuts.json` and make manual adjustments to the most recent file.

- Adding new shortcuts requires repeating the export and upload process, ensuring only the 'Settings' checkbox is selected and the password step is skipped.

- If you add new shortcuts or cant find a shortcut as expected you will need to repeat the export and upload process, ensuring only the 'Settings' checkbox is selected and the password step is skipped. 
*I could not find a way to directly access the hotkeys or a way to automate the export process.*

## Notes
**Memorkeys Shortcut:**

- I personally mapped Memorkeys to `⌘ + Opt + /`

**Preferences (in Raycast settings `⌘ + ,`):**

- Show Plus Icon: This setting shows a plus icon between modifiers in shortcuts (on by default).
- Search Filter: This setting allows you to search for shortcuts by app or shortcut name when not in focused app mode (both by default).

**Ergonomic Score:**

- The ergonomic score provides an arbitrary measure of how ergonomic a shortcut is, it's mostly just for fun.

**Developer Notes:**
For any developers wanting to expand upon this idea the actual formatting functions for handling the app and action names are mostly solid but I encountered an issue with the Window Manager shortcuts so for now there is a quick fix for that. 

Not an issue at the moment but this definitely wont work on Windows. The `.rayconfig` stores the associated key as apple script key codes so it would need to be reworked to accept Windows key code equivalent. Or if Raycast exposes the users hotkeys in the future this would be a nonissue.

Some of the front end routing is cursor/claude generated so there may be some head scratchers in here. This was meant to be a quick ADHD project just for personal use, so I did not feel like diving to deep into optimization once I got it to work.

**A Few More Feature Ideas:**
1.  **Shortcut Chains Feature:**

	- Track and suggest common sequences of shortcuts users perform

	- Show "combo suggestions" like "After using `⌘ + C`, users often use `⌘ + V` within 2 seconds"

	- Help users optimize their workflow by discovering patterns

2.  **Accessibility Focus Mode:**

	- Add a mode that suggests alternative shortcuts for users with limited mobility

	- Suggest one handed shortcut for speed or two handed shortcut that eases strain

3.  **Implement real-time modifier key filtering:**

	- Filter shortcuts based on currently pressed modifier keys

	- Show visual feedback for active modifiers


4.  **"Hotkey Hero" game mode:**

	- Practice mode for learning shortcuts
