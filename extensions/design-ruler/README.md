# Design Ruler

Measure UI with edge detection and place guides to check alignment. Both commands freeze the screen in a fullscreen overlay, work across all your monitors, and zoom to 4x with **Z**.

## Setup

Design Ruler reads the screen, so Raycast needs the Screen Recording permission:

1. Run **Measure** or **Alignment Guides**. macOS asks whether Raycast can record the screen.
2. Turn on Raycast in **System Settings → Privacy & Security → Screen Recording**. If macOS offers to quit and reopen Raycast, let it.

Until then, the commands show a message pointing to that setting instead of the overlay.

## <img src="media/measure-icon.png" width="32" valign="middle" alt=""> Measure

Hover anything to see the distance to its edges in all four directions, with a live W × H. Drag to measure an area: the selection snaps to the edges it finds.

<p align="center">
  <img src="media/measure-01.png" width="48%" alt="Hover to measure anything: the crosshair on a button reads W 32 × H 32">
  <img src="media/measure-02.png" width="48%" alt="Drag to measure areas: selections around a search field and a button group read 197 × 32 and 57 × 32">
</p>

| Key | Action |
|---|---|
| Arrow keys | Skip to the next edge in that direction |
| Shift + Arrow | Bring the edge back |
| Drag | Measure an area (snaps to edges) |
| Click a selection | Remove it |
| Z | Zoom 1x → 2x → 4x |
| Esc | Exit |

## <img src="media/alignment-guides-icon.png" width="32" valign="middle" alt=""> Alignment Guides

Click to place vertical or horizontal guides. Each one shows its exact X or Y position while you place it.

<p align="center">
  <img src="media/alignment-guides-01.png" width="48%" alt="Line things up: vertical and horizontal guides in different colors along a sidebar, with the color picker">
  <img src="media/alignment-guides-02.png" width="48%" alt="Know where every guide sits: a horizontal guide along two buttons with its Y 761 position pill">
</p>

| Key | Action |
|---|---|
| Click | Place a guide |
| Click a guide | Remove it |
| Tab | Switch between vertical and horizontal |
| Space | Change the color (Dynamic, red, green, orange, blue) |
| Z | Zoom 1x → 2x → 4x |
| Esc | Exit |

## Preferences

| Preference | Command | Default | |
|---|---|---|---|
| Show Hint Bar | Both | On | The keyboard shortcuts at the bottom of the overlay |
| Count 1px Borders | Measure | Smart | Whether 1px borders count in measurements. Smart counts them or not, whichever fits the 4px grid; a green tick marks an edge whose border was counted |
| Remember Color and Direction | Alignment Guides | Off | Start with the color and direction you used last, instead of Dynamic and vertical |

## Also a menu bar app

Design Ruler is also a standalone macOS app with global keyboard shortcuts, from [GitHub](https://github.com/haythemgataa/design-ruler).
