/**
 * The extension preferences, derived from the manifest rather than restated.
 *
 * `Preferences` is generated from `package.json`, so adding, renaming or
 * removing a preference there cannot drift from this type — a stale field name
 * becomes a compile error instead of an `undefined` read at runtime.
 *
 * It is wrapped in `Partial` on purpose: the generated type declares every
 * preference as always present, but Raycast hands back `undefined` for one that
 * was never filled in — on Windows this crashed the extension on
 * `preferences.base.trim()`. Marking them all optional forces every read
 * through `readPreference()` in `@/lib/utils/connection`.
 */
export type SonarrPreferences = Partial<Preferences>;
