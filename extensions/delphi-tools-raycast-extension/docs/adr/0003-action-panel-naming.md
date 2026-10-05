# Action Panel naming

Raycast Action Panel titles should use Title Case so commands read consistently in Raycast and match store review expectations. Examples: `Open in Browser`, `Copy to Clipboard`, `Copy Input`, `Use 16px as Font Size`.

Actions that open a submenu should end with an ellipsis character: `Set Priority…`, `Select Color…`, `Choose Output…`. Submenu item titles should name only the selected value or operation and should not repeat the parent action text. Prefer `Low`, `Medium`, `High` under `Set Priority…`, not `Set Priority Low`.

Action lists should not mix iconed and uniconed actions. If any action in an `ActionPanel.Section` has an icon, every action in that section should have one. Use familiar Raycast icons where possible, for example `Icon.Clipboard` for copy actions, `Icon.Code` for copied code snippets, and file or browser icons for file and browser actions.

These rules apply to hand-written actions, generated actions, and reusable action helpers.
