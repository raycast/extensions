# ROM Launcher

The ultimate retro gaming companion for Raycast. Browse your local ROM library, view rich metadata, track your play stats, and monitor your RetroAchievements progress without leaving your launcher.

## Features

- **Browse & Launch Games:** Instantly search your local ROM directories and launch games directly via your preferred emulator.
- **Smart Metadata Parsing:** Automatically fetches boxarts, release years, developers, publishers, and ratings using Libretro databases. 
- **RetroAchievements Integration:** View your unlocked achievements, hardcore status, completion progress, and recent unlocks for supported cores directly in the detail view.
- **Play Stats Tracking:** Keep track of your most played games and last played dates. Sort your library dynamically based on your gaming habits.
- **Manage Libraries:** Easily add multiple ROM directories, assign specific console systems, and configure default emulator cores.
- **Cross-Platform Support:** Adaptive shortcuts and path handling for both macOS and Windows environments.

## Setup

To use the full capabilities of the extension, especially the **RetroAchievements** integration, follow these steps:

1. **Configure Emulator:** Ensure you have your preferred emulator (e.g., RetroArch) installed and configured on your system.
2. **RetroAchievements Account (Optional):** Create an account at [RetroAchievements](https://retroachievements.org/).
3. **Get API Key:** Go to your RetroAchievements control panel / settings to find your **Web API Key**.
4. In Raycast, open the extension preferences and fill in:
   - **RetroAchievements Username** — your RA account username.
   - **RetroAchievements API Key** — your RA Web API Key.
   - **Show Details** — toggle to show or hide the right metadata panel by default.
5. Open the **Manage Libraries** command in the extension to add your local ROM folders and associate them with the correct systems and cores.

## Commands

| Command              | Description                                                                 |
| :------------------- | :-------------------------------------------------------------------------- |
| **Browse ROMs** | Look up your local games, view metadata/achievements, and launch them.      |
| **Manage Libraries** | Add, edit, or remove local ROM folders and assign emulator cores.           |

## Actions

### Global Actions

- **Enter** — Launch the selected game (Play Now).

### Browse ROMs

- **Cmd+E / Ctrl+E** — Show the ROM file in Finder/Explorer.
- **Cmd+M / Ctrl+M** — Open the Manage Libraries view.
- **Cmd+Shift+A / Ctrl+Shift+A** — View all achievements for the selected game (only available for supported RA cores with active achievement sets).

### Achievements View

- **Enter** — View detailed information for a specific achievement.
- **Cmd+Shift+R / Ctrl+Shift+R** — Open the specific game page on the RetroAchievements website.

## Troubleshooting

- **Achievements stuck on "Loading..." or "Credentials Missing"?** Double-check that you entered your RetroAchievements Web API Key (not your account password) and Username correctly in the extension preferences.
- **Boxarts not loading?** The extension relies on standard Libretro/No-Intro naming conventions. Ensure your ROM file names closely match the official game titles.
- **Missing "View All Achievements" action?** This action only appears if the game is associated with a supported RetroAchievements core (e.g., `snes9x_libretro`, `fbneo_libretro`) and actually has an active achievement set on the server.

## Support

If you find this extension useful, consider buying me a coffee.

<a href="https://buymeacoffee.com/glct26" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>