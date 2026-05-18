# RayDoom

Play the classic first-person shooter DOOM directly in Raycast, rendered entirely in ASCII art. Experience the legendary 1993 game with episode selection, difficulty levels, and real-time player statistics.

## Features

- **Play DOOM:** Launch DOOM with interactive episode and difficulty selection. Navigate through a user-friendly menu system to configure your game session before diving into the action.

- **Quick Launch:** Start DOOM immediately with default settings (Episode 1, Normal difficulty). Skip the setup and get straight into the game.

- **Live Stats Display:** Real-time navigation title showing health, armor, ammo, and kill count (`H:100% A:0% B:50 K:01`) while playing.

- **Event Notifications:** Toast notifications for key pickups, secret discoveries, and low health warnings.

## Setup / Installation

1. Install the RayDoom extension from the Raycast Store or load it in development mode.

2. On first launch, the extension automatically downloads the DOOM Shareware WAD file (approximately 4MB). This is a one-time download and requires an active internet connection.

3. The WAD file is stored in Raycast's support directory and persists across sessions.

## Configuration

The extension works out-of-the-box with sensible defaults, but movement feel can be tuned via Raycast extension preferences.

### Movement Delay Settings

Open Raycast → Extensions → RayDoom → Preferences to adjust:

| Preference                      | Default | Description                                                                           |
| ------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| **Forward/Backward Delay (ms)** | `200`   | How long W and S keys stay pressed. Higher = smoother movement, less pressing needed. |
| **Turn/Strafe Delay (ms)**      | `150`   | How long A, D, Q, E keys stay pressed.                                                |

These settings apply to both **Play DOOM** and **Quick Launch** commands. Fire, weapon selection, and menu keys always use short fixed delays (50–100ms) for responsiveness.

### Technical Details

- **Episode Support:** Currently supports Episode 1 "Knee-Deep in the Dead" from DOOM Shareware. Episodes 2-4 require the registered or Ultimate DOOM versions.

- **Difficulty Levels:**
  - I'm too young to die (Very Easy)
  - Hey, not too rough (Easy)
  - Hurt me plenty (Normal)
  - Ultra-Violence (Hard)
  - Nightmare! (Very Hard)

- **Display Resolution:** The game renders at 106x20 character resolution in ASCII format to fit within Raycast's text-based display environment.

- **Performance:** The DOOM engine runs at 35 FPS internally, while the display updates at approximately 15 FPS to balance visual quality with system performance.

## Usage Instructions

### Controls

**Movement:**

- `W` - Move forward
- `S` - Move backward
- `A` - Turn left
- `D` - Turn right
- `Q` - Strafe left
- `E` - Strafe right

**Actions:**

- `F` - Fire weapon
- `R` - Use / Open doors
- `1-7` - Select weapons
- `Tab` - Show map
- `Cmd+M` - Open menu

**Menu Navigation:**

- `Return` - Select / Enter
- `Y` - Yes
- `N` - No
- `Cmd+M` - Open DOOM in-game menu

**Game Control:**

- `Cmd+Shift+Q` - **Stop Game** (cleanly exits and releases memory)
- `Cmd+Shift+R` - **Redownload WAD File** (delete and re-download on next launch)

> **Note:** The ESC key opens DOOM's in-game pause menu (standard DOOM behavior). To fully stop the game and release WASM resources, use `Cmd+Shift+Q` or select "Stop Game" from the Action Panel.

**Debugging:**

- `Cmd+Shift+C` - Copy current frame to clipboard

### Navigation Title Stats

While playing, the window title bar displays real-time stats:

- **H:** Health percentage (0-200%)
- **A:** Armor percentage (0-200%)
- **B:** Bullets/ammo for current weapon (∞ for fist/chainsaw)
- **K:** Kill count

Example: `H:100% A:0% B:50 K:01`

### Event Toasts

Animated notifications appear for:

- **Key Pickups:** Blue, Yellow, Red keycards and skull keys
- **Secrets Found:** When discovering secret areas
- **Low Health:** Warning when health drops to 25% or below

### WAD File Management

The extension automatically downloads the DOOM Shareware WAD file on first launch from trusted sources. The file is validated and stored locally for future sessions.

## Limitations

- Only DOOM Shareware Episode 1 is available by default
- ASCII rendering reduces visual fidelity compared to original graphics
- Lower resolution (106x20) compared to original DOOM (320x200)
- Some menu interactions are challenging in ASCII mode (use Raycast menus for configuration)

## License

This Raycast extension is licensed under the MIT License.

The raydoom-core package (DOOM engine) is licensed under GPLv2. It uses a custom fork of [doom-ascii-wasm](https://github.com/Saketh-Chandra/doom-ascii-wasm) (based on [doom-ascii](https://github.com/wojciech-graj/doom-ascii) by Wojciech Graj), which is derived from the original DOOM source code by id Software.

## Author

[Saketh Chandra](https://github.com/Saketh-Chandra)

## Acknowledgments

- id Software for the original DOOM source code
- The doom-ascii project for the ASCII rendering implementation
- The Raycast team for the extension platform
