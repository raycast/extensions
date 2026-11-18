const dateTokens: Record<string, string> = { Y: "yyyy", y: "yy", m: "MM", d: "dd", H: "HH", M: "mm", S: "ss" };

export function convertMacros(text: string): { text: string; changes: string[] } {
  const remaining = text.replace(/%clipboard\b|%\||%[YymdHMS](?![A-Za-z])/g, "");
  const cursors = (text.match(/%\||\{cursor\b/g) ?? []).length;
  // Leave the entire snippet intact when a macro needs context we cannot translate.
  if (text.includes("%%") || /%\S/.test(remaining) || cursors > 1) return { text, changes: [] };
  const changes: string[] = [];
  const converted = text.replace(
    /%clipboard\b|%\||%[YymdHMS](?![A-Za-z])(?:[ ./,:_-]*%[YymdHMS](?![A-Za-z]))*/g,
    (macro) => {
      const replacement =
        macro === "%clipboard"
          ? "{clipboard}"
          : macro === "%|"
            ? "{cursor}"
            : `{date format="${macro.replace(/%([YymdHMS])/g, (token, letter: string) => dateTokens[letter] ?? token)}"}`;
      changes.push(`${macro} → ${replacement}`);
      return replacement;
    },
  );
  return { text: converted, changes: [...new Set(changes)] };
}

export function hasTextExpanderMacros(text: string): boolean {
  return /%(?:[a-zA-Z]|\||\\|@|\^|<|>)/.test(text);
}
