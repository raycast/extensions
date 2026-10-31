# Multimeter

Send numbers from Raycast to [Multimeter](https://multimeterapp.com), the Mac menu bar app that shows live meters for anything: battery, CPU, network, timers and your own numbers.

You need Multimeter installed (the direct download or the Mac App Store version).

## Commands

### Set Meter Value

Sends a value to every **Sent Value** meter with the same key. Fill in:

| Field | Required | What it does |
|-------|----------|--------------|
| Key | yes | The meter's key, like `deploys`. Not case-sensitive. |
| Value | yes | The number to show, like `42`. |
| Min | no | Bottom of the meter's range. |
| Max | no | Top of the meter's range, so a value of 42 with max 100 fills the meter 42%. |
| Label | no | Text the face shows next to the value. |
| Unit | no | Unit shown after the number, like `ms` or `GB`. |

The extension opens a link like this in the background, so Multimeter never comes forward:

```
multimeter://set?key=deploys&value=42&max=100&label=Deploys
```

Multimeter remembers the last value for each key between launches. Each value you send replaces the previous one, including its min, max, label and unit.

### Add Meter

Opens Multimeter's Add Meter window. Pick **Sent Value** as the source and give it a key to create a meter you can update from Raycast.

## Setup

1. Install Multimeter from [multimeterapp.com](https://multimeterapp.com).
2. In Multimeter, choose **Add Meter…**, pick **Sent Value**, and set a key (for example `deploys`).
3. Run **Set Meter Value** in Raycast with the same key.

## The link format

Anything that can open a link can update a meter, so the same link works from Terminal, scripts, Shortcuts and cron:

```sh
open -g "multimeter://set?key=deploys&value=42"
```

Supported parameters: `key` and `value` (required), plus `min`, `max`, `label`, `unit` and `formatted` (text shown instead of the number). Full reference: [Creating Meters](https://multimeterapp.com/creating-meters).

## Support

[multimeterapp.com/support](https://multimeterapp.com/support) or hello@greatwork.company.
