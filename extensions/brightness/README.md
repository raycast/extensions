# Brightness

Control the brightness of your Mac.

## Commands

- `Set Brightness to 0%`: Sets the built-in display brightness to 0%.
- `Set Brightness to 25%`: Sets the built-in display brightness to 25%.
- `Set Brightness to 50%`: Sets the built-in display brightness to 50%.
- `Set Brightness to 75%`: Sets the built-in display brightness to 75%.
- `Set Brightness to 100%`: Sets the built-in display brightness to 100%.
- `Turn Brightness Up`: Increases the built-in display brightness by 6.25%.
- `Turn Brightness Down`: Decreases the built-in display brightness by 6.25%.

## Notes

- macOS only.
- Uses a bundled native Swift helper based on the `nriley/brightness` approach.
- Targets the built-in display under the cursor when available, otherwise falls back to the main display.
- External monitors are not supported in this phase.

## Attribution

Brightness control is based on a native Swift port of the approach used in
[`nriley/brightness`](https://github.com/nriley/brightness) by Nicholas Riley.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
for license and attribution details.
