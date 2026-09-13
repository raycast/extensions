/// Ritual's eight named tag-colour tokens (`TagColorToken` in
/// Ritual/TagColors.swift), each mapped to its 500-shade hex swatch from
/// that file's palette — the single representative colour for a token that
/// the app itself renders as a light/dark background+text PAIR (200/800,
/// swapped by scheme). Raycast tags are one solid colour, not a pair, and
/// `Color.Raw` hex strings are dynamically contrast-adjusted by Raycast
/// itself against its own theme, so one mid-scale swatch per token is enough
/// — no need to hand-roll a light/dark split here.
const TOKEN_HEX: Record<string, string> = {
  red: "#CD737B",
  orange: "#CD8A57",
  amber: "#C7A654",
  green: "#9AD46E",
  teal: "#66B5AC",
  blue: "#7A82DB",
  purple: "#9B8EDB",
  pink: "#DCAFDB",
};

/**
 * Resolve one of Ritual's stored tag-colour tokens to a hex string Raycast's
 * `color` props accept directly (`Color.ColorLike`'s `Color.Raw` arm is a
 * plain string).
 *
 * Deliberately returns a raw string rather than one of Raycast's `Color.*`
 * enum members: nothing under `src/api/` may import `@raycast/api` (it's
 * shared by non-UI code and only resolves inside a running extension
 * process), so this can't reach for `Color.Blue` etc. even if it wanted to.
 * A hex string needs no such import and renders identically.
 *
 * Returns `undefined` — never throws — for a missing token (a tag with no
 * colour) or one this table doesn't recognise (e.g. a token a future Ritual
 * build might add). The caller passes that straight through as
 * `color: undefined`, which falls back to Raycast's own default tag
 * styling.
 */
export function tagColorHex(token: string | undefined): string | undefined {
  if (!token) return undefined;
  return TOKEN_HEX[token];
}
