# Sensitivity Calculator

Calculate the sensitivity or cm/360 for games.

## Features

- **Calculate cm/360**: Determine the physical mouse movement needed for a 360° turn in your game
- **Calculate Sensitivity**: Find the in-game sensitivity that gives you a specific cm/360
- **Automatic Calculation**: Results are calculated in real-time as you type
- **Clipboard Support**: Copy results to clipboard with one click
- **Game Support**: Includes yaw values for popular games

## Usage

### Calculate cm/360

1. Select your game from the dropdown
2. Enter your in-game sensitivity
3. Enter your mouse DPI
4. The cm/360 result appears automatically
5. Click "Copy Result" to copy to clipboard

### Calculate Sensitivity

1. Select your game from the dropdown
2. Enter your target cm/360 value
3. Enter your mouse DPI
4. The sensitivity result appears automatically
5. Click "Copy Result" to copy to clipboard

## Supported Games (Alphabetical)

- Apex Legends (0.022 yaw)
- Battlefield 5 (0.022 yaw)
- CS (1.6) (0.022 yaw)
- Destiny 2 (0.0066 yaw)
- DOOM (0.0439 yaw)
- Fortnite (0.5715 yaw)
- Overwatch (0.0066 yaw)
- Overwatch 2 (0.006666 yaw)
- PUBG (2.22222 yaw)
- QCDE (0.0439 yaw)
- Q3 Arena (0.022 yaw)
- Quake (0.022 yaw)
- Quake Live (0.02105 yaw)
- Rainbow Six (0.0057 yaw)
- Reflex (0.0057 yaw)
- Siege (0.0057 yaw)
- Source Engine (CS2, CSGO, etc.) (0.022 yaw)
- Unreal Tournament (0.596 yaw)
- VAL (0.07 yaw)
- Valorant (0.07 yaw)

## Formulas

- **cm/360** = (360 / (yaw × sensitivity) / DPI) × 2.54
- **Sensitivity** = (360 / ((cm/360 / 2.54) × DPI)) / yaw
