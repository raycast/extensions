# XDR Boost

Make SDR content brighter on XDR displays (the MacBook Pro's built-in Liquid Retina XDR and the Pro
Display XDR) by using their EDR headroom, controlled from Raycast.

## How it works

A small Swift helper, built from source in `swift/Sources/XDRBoostHelper/`, runs in the background while
the boost is on. It keeps each XDR panel in EDR mode with a 1×1 pixel window and raises the display's
gamma table. Turning the boost off or quitting Raycast quits the helper, and macOS restores the original
table the moment the helper exits, even if it crashes.

How much brighter a level gets depends on the display and on your brightness slider: the helper never
asks for more than the panel's current headroom allows, and it holds external XDR displays to a
conservative limit, because a Pro Display XDR can go black when pushed too far.

The boost pauses by itself while the screen saver runs, the screen is locked or asleep, Low Power Mode
is on, or the battery is below your chosen level, and comes back when that ends.

## Commands

- **Show XDR Boost in Menu Bar**: set all displays or each display to Off, Low, Medium, High or Max
  (⌘0 to ⌘4), and see why the boost is paused.
- **Set XDR Boost**: pick a level for all displays or for one display.
- **Quick Set XDR Boost**: set every display from the search bar: `1.5`, `50%` or `High`.
- **Toggle XDR Boost**: turn the boost on at your default level, or off.
- **Increase Boost** / **Decrease Boost**: step each display up or down from its own level.

You can also ask Raycast AI, for example "@xdr-boost boost my display to max".

## Preferences

- **Default Level**: the level Toggle XDR Boost turns on (High by default).
- **After Restart**: off by default. When on, the menu bar command restarts the boost at your last
  levels if the helper is gone, for example after a restart or a Raycast update. Nothing else runs in the background:
  there is no login item and no LaunchAgent.
- **Boost Strategy**: Follow Brightness (default) raises Max as you lower the brightness slider.
  Fixed Maximum keeps Max the same.
- **External XDR Maximum**: with Fixed Maximum, how far Max goes on an external XDR display.
- **Pause When Battery Below**: on battery power, pause the boost below this charge (20% by default).
- **Notifications**: a notification after every change.

## Requirements

A Mac with an XDR display. Displays without EDR headroom are skipped. On M5 Pro and M5 Max Macs the
gamma table has no visible effect, so the boost does nothing there.

## Credits

XDR Boost builds on these open-source projects:

- [Headroom](https://github.com/fich-l/headroom) by fichl (MIT): the Swift helper is ported from its
  `Gamma.swift`, including the EDR trigger window, the gamma-table write and the preset levels.
- [xdr-lift](https://github.com/Justaboringname/xdr-lift) by Yihan Zhu (MIT): the trigger window setup,
  the finding that the gamma table is gamma-encoded, and the cap that keeps light below 95% of the
  panel's headroom.
- [Illuminate](https://github.com/fackelmeyer/illuminate) by Jonas Fackelmeyer (MIT): the boost curve
  that follows the brightness slider, the per-model display peaks, pausing for system states, and the
  M5 Pro / M5 Max detection.
- [BrightIntosh](https://github.com/niklasr22/BrightIntosh) by niklasr22 (GPL-3.0): its described
  behavior informed waiting for EDR before writing a table. None of its code was read or used.
- [extensions-swift-tools](https://github.com/raycast/extensions-swift-tools) by Raycast: builds the
  Swift helper from source and calls it from TypeScript.

License texts and the commits read are in [NOTICE.md](NOTICE.md).
