# No More Caffeine

Track your caffeine intake and predict residual levels in your body to make informed decisions about whether you can safely consume more caffeine.

Instead of just tracking *total daily intake*, this extension estimates the *remaining caffeine in your body* using exponential decay calculations and uses that plus time of day to determine whether additional caffeine is likely to disturb your sleep.

## Features

- **Residual Caffeine Calculation** - Calculates how much caffeine remains in your system using exponential decay
- **Bedtime Prediction** - Predicts residual caffeine levels at your bedtime
- **Status Indicators** - Safe, Warning, or No More Caffeine based on predicted impact
- **Quick Logging** - Built-in presets (Coffee, Espresso, Tea, Energy Drink, etc.) and custom drinks
- **Menu Bar Integration** - Monitor status directly from the menu bar
- **Intake History** - View all caffeine intake organized by date

## Commands

| Command | Description |
|--------|-------------|
| **Log Caffeine** | Log intake and see predicted impact on bedtime levels |
| **Today's Caffeine** | View history, current residual, and predicted bedtime levels |
| **Caffeine Settings** | Configure bedtime, half-life, thresholds, and custom drinks |
| **Caffeine Status** | Menu bar showing current status with quick access |

## Status Indicators

- **Safe** 🟢 - Safe to consume more caffeine
- **Warning** 🟠 - Approaching your caffeine limit
- **No More Caffeine** 🔴 - May disturb sleep or exceed daily limit

## Settings

Configure in Raycast Preferences → Extensions → No More Caffeine:

- **Bedtime** - Your usual bedtime (HH:mm format, default: 22:00)
- **Caffeine Half-Life** - Hours for half elimination (default: 5)
- **Max Residual at Bedtime** - Maximum allowed at bedtime in mg (default: 50)
- **Daily Max Caffeine** - Optional daily limit in mg (recommended: 200-400)

## Built-in Drink Presets

Coffee (95 mg), Espresso (64 mg), Energy Drink (80 mg), Tea (47 mg), Green Tea (28 mg), Cola (34 mg)

You can also create custom drink presets with your preferred caffeine amounts.

## Keyboard Shortcuts

- `⌘ ⇧ Delete` - Delete an intake record
- `⌘ R` - Refresh the list

## Disclaimer

- This extension is designed **solely** to help users visualize their caffeine intake and support self-management of daily habits.
- The information provided by this extension (estimated residual caffeine, status labels, messages, etc.) **is not guaranteed to be medically or scientifically accurate or complete**.
- This extension **must not be used as a substitute for professional medical advice, diagnosis, treatment, prevention, or any other medical service**.
- If you have any concerns about your health — including sleep problems, existing medical conditions, or possible interactions with medications — you should always consult a physician or other qualified healthcare professional.
- The developer assumes no responsibility or liability for any outcome, loss, or damage arising from the use of this extension. Use it at your own discretion and risk.
