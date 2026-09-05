/** Where a profile's color came from, so real Chrome colors are never confused
 * with a deterministic fallback we generated ourselves. */
export type ColorSource = "chrome" | "generated";

/** A Chrome profile as discovered from local metadata. `directory` is the only
 * field guaranteed present and is always the value used in the launch command. */
export type ChromeProfile = {
  /** Internal Chrome directory, e.g. "Default", "Profile 2", "Andy". Launch key. */
  directory: string;
  /** Resolved display name. */
  name: string;
  /** Account email, when `user_name` looks like an email address. */
  email?: string;
  /** Absolute path to a local profile photo, when present on disk. */
  avatarPath?: string;
  /** "#RRGGBB" decoded from Chrome's profile_color_seed, when available. */
  color?: string;
  colorSource: ColorSource;
  isDefault: boolean;
};
