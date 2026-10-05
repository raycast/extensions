type MacModifier = "cmd" | "ctrl" | "opt" | "shift";
type WindowsModifier = "ctrl" | "alt" | "shift";

export function platformShortcut<Key extends string>(modifiers: MacModifier[], key: Key) {
  const windowsModifiers = modifiers.map((modifier): WindowsModifier => {
    if (modifier === "cmd") return "ctrl";
    if (modifier === "opt") return "alt";
    return modifier;
  });

  return {
    macOS: { modifiers, key },
    Windows: { modifiers: windowsModifiers, key },
  };
}
