import type { Keyboard } from "@raycast/api";

/**
 * The same chord on both platforms: Command on macOS, Control on Windows.
 *
 * A shortcut written with a bare `cmd` is not translated on Windows, it is
 * ignored, so an extension that declares both platforms has to spell both out.
 * See https://developers.raycast.com/api-reference/keyboard
 */
export function onBothPlatforms(
  key: Keyboard.KeyEquivalent,
  ...alsoHeld: Keyboard.KeyModifier[]
): Keyboard.Shortcut {
  return {
    macOS: { modifiers: ["cmd", ...alsoHeld], key },
    Windows: { modifiers: ["ctrl", ...alsoHeld], key },
  };
}
