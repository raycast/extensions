Screenshots for the Raycast store go here. The store requires **exactly
2000 × 1250 pixels**, and `ray lint` fails on anything else.

Raycast's own Window Capture writes that size straight into this folder, which
is the shortest path when it is available. It is not the only one: a plain
macOS screenshot of the window (⌘⇧4, then space, then click) comes out at the
screen's own size — 1724 × 1174 on a 14" MacBook Pro — and converts cleanly,
because the capture's surround is transparent. Scale the whole window to fit
and centre it on a 2000 × 1250 canvas; nothing is stretched and the added
space has no edge to hide. Never resize to 2000 × 1250 directly: the aspect
ratios differ (1.47 against 1.60) and the distortion is visible.

Up to six. **The order in this folder is the order the store shows them**, so
the first should be the one that explains what the extension is.
