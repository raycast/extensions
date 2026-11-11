# Screen Align

Line up two displays so the pointer crosses between them at the right height — with a real millimeter ruler on each screen instead of a drag-and-guess in System Settings.

## Why it is fiddly without this

macOS arranges displays in *points*, but your eye judges them in *millimeters*. A MacBook panel and a 32" monitor can differ by 10% in points per millimeter, so two displays that look aligned in System Settings are not aligned on your desk.

## Commands

**Show Display Rulers** — draws a millimeter ruler along the edge of each screen that faces its neighbor, plus one shared red reference line. The line is a single position in the global display space, so it lands on both screens at once; nudge until the two lines look level in the real world and the pointer crosses there with no jump.

| Key | Action |
| --- | --- |
| `↑` `↓` (side by side)<br>`←` `→` (stacked) | Align the second display by 1 pt |
| with `⇧` | Move it by 10 pt |
| with `⌥` | Move the reference line itself |
| `T` `C` `B` / `L` `C` `R` | Snap to aligned tops, centers, bottoms — or left, center, right |
| `U` | Undo back to where you started |
| `H` | Hide the read-out |
| `esc` | Done |

### Which way you can move

macOS pins displays flush against each other along the edge they share and silently undoes anything else — gaps and overlaps are both refused. So only the perpendicular axis is adjustable, and the rulers follow it:

| Arrangement | Pinned by macOS | You adjust | Rulers |
| --- | --- | --- | --- |
| Side by side | horizontal | vertical, with `↑` `↓` | down the facing left and right edges |
| Stacked | vertical | horizontal, with `←` `→` | along the facing top and bottom edges |

Move a display to a different side and the whole extension switches axis with it.

Run the command again to close the rulers. Nudges are drawn immediately and written to the display configuration once you stop pressing, because each change takes macOS about a third of a second to apply.

**Arrange Displays** — the same moves from a Raycast list, with the exact numbers: position, panel size in millimeters, density, offset from aligned tops, and the band where the pointer can cross.

**Display Layouts** — save the current arrangement and restore it after a reconnect. Displays are matched by hardware UUID, so it survives unplugging and re-plugging.

## One thing worth knowing

If your two displays have different densities, there is exactly one height where the crossing is physically perfect, and the error grows as you move away from it. Put the reference line where you actually cross — the read-out tells you how fast it drifts. Matching the densities instead means choosing scaled resolutions whose points per millimeter agree.

## Requirements

No permissions, no helper apps, no `brew install`. The arrangement is changed through the public CoreGraphics display configuration API and is saved permanently.
