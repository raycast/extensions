// `Preferences` and `Arguments` are generated from package.json into
// raycast-env.d.ts by `ray develop` / `ray build`. Deriving from them means
// renaming or removing a preference in the manifest becomes a compile error
// instead of a silently-undefined value at runtime.

export type FileNameStyle = Preferences["fileNameStyle"];

/**
 * Preferences as the lib layer consumes them. Partial on purpose: Raycast
 * always supplies every field to a command, but the pure functions below the
 * command layer are called with just the subset they need (including in tests).
 */
export type CommandPreferences = Partial<Preferences>;

/** Optional command arguments are absent rather than empty when unset. */
export type CommandArguments = Partial<Arguments.DisplayUrl>;
