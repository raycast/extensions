# No More Caffeine

Log caffeine and see how much may remain at bedtime. Estimates account for gradual absorption after each drink and elimination over time using your configured half-life.

## Commands

| Command                | What you can do                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Log Caffeine**       | Log a drink now or backdate it. Enter a serving volume to estimate the caffeine, or enter the amount from the label.                                             |
| **Quick Log Caffeine** | Select a preset or favorite and press Enter to log its default serving. Manage favorites from the action panel.                                                  |
| **Today's Caffeine**   | Review current levels and past drinks. Edit a drink to correct its time, amount, or name.                                                                        |
| **Caffeine Timeline**  | See a 24-hour dot-matrix curve with drink markers, bedtime, and your threshold. Open the action panel to edit a timeline drink or try a simulation.              |
| **What If**            | Preview a drink and compare the bedtime estimate with your logged baseline. Change its volume, amount, or time without saving it.                                |
| **Caffeine History**   | Switch between today by hour, the last 7 days, and the last 30 days. Export all retained entries as JSON or import an earlier export. Imports merge by entry ID. |
| **Caffeine Settings**  | Set bedtime, half-life, and thresholds. Create custom presets with your own amounts and serving volumes.                                                         |
| **Caffeine Status**    | See an estimate in the menu bar and jump to logging, timeline, and history.                                                                                      |

## Raycast AI

Mention `@no-more-caffeine` in Raycast AI to get your current estimate, preview a drink, check your last-cup cutoff, view intake trends, or log a drink. Logging shows the drink, dose, and time for confirmation. Forecasts and history include links to their Raycast charts.

- “What if I had 350 mL of cold brew at 4 pm?”
- “Show my caffeine trends over the last 30 days.”
- “Log the 60 mg of caffeine I had in a matcha at 9:15 today.”

## Estimates

**Last cup by** shows the latest estimated time for the selected drink to peak by bedtime and keep the bedtime estimate below your threshold. The timeline starts with a 95 mg coffee. What If recalculates the cutoff for your selected drink. The reports show modeled caffeine levels. Individual sleep responses vary.

Before bedtime, the status compares the bedtime estimate and daily total with your configured limits. For six hours after bedtime, the status uses the current estimate, including across midnight. Labels are **Below Limits**, **Warning**, and **No More Caffeine**.

## Settings

Configure in Raycast Preferences → Extensions → No More Caffeine:

- **Bedtime** - Your usual bedtime (HH:mm format, default: 22:00)
- **Caffeine Half-Life** - Hours for half elimination (default: 5)
- **Max Residual at Bedtime** - Maximum allowed at bedtime in mg (default: 50)
- **Daily Max Caffeine** - Optional daily limit in mg (recommended: 200-400)

## Built-in Drink Presets

Coffee (95 mg), Espresso (64 mg), Cold Brew (150 mg), Matcha (60 mg), Energy Drink (80 mg), Tea (47 mg), Green Tea (28 mg), and Cola (34 mg) per default serving. Actual amounts vary by brand and preparation.

You can also create custom drink presets with your preferred caffeine amounts.

## Keyboard Shortcuts

- `⌘ ⇧ Delete` - Delete an intake record
- `⌘ R` - Refresh the list

## Credits

The dot-matrix timeline and model are inspired by [Caffeine Day by Charles Postiaux](https://github.com/charles-postiaux/caffeine-day). The Raycast SVG rendering follows the [Network Hogs example](https://github.com/raycast/extensions/tree/459326f4f557692a79246dba2d013746f56d724b/extensions/network-hogs).

## Disclaimer

- This extension is designed **solely** to help users visualize their caffeine intake and support self-management of daily habits.
- The information provided by this extension (estimated residual caffeine, status labels, messages, etc.) **is not guaranteed to be medically or scientifically accurate or complete**.
- This extension **must not be used as a substitute for professional medical advice, diagnosis, treatment, prevention, or any other medical service**.
- If you have any concerns about your health — including sleep problems, existing medical conditions, or possible interactions with medications — you should always consult a physician or other qualified healthcare professional.
- The developer assumes no responsibility or liability for any outcome, loss, or damage arising from the use of this extension. Use it at your own discretion and risk.
