/**
 * Aggregation interface for all applications.
 */
export interface AllApps {
  list: InputApp[];
}

/**
 * High level type for each application.
 * Each application consist of name, bundleId and keymaps.
 */
export interface InputApp {
  bundleId?: string;
  hostname?: string;
  name: string;
  slug: string;
  keymaps: InputKeymap[];
}

/**
 * Application keymap. Keymap is a shortcut configuration.
 * Most of the applications have single keymap that should be named "Default".
 * Each keymap consist of title and sections.
 */
export interface InputKeymap {
  title: string;
  sections: InputSection[];
}

/**
 * Section with shortcuts or category. Examples: Edit, Navigate, Format.
 * Each section consist of title and shortcuts.
 */
export interface InputSection {
  title: string;
  shortcuts: InputShortcut[];
}

/**
 * Shortcut with title, key and comment.
 * There should be at least key or comment field. Key contains structured shortcut declaration while comment is just a string value.
 * Key consist of modifiers plus base key separated by '+' sign.
 * Supported modifiers: 'ctrl', 'shift', 'opt', 'cmd'. Modifiers should be specified in that exact order, lowercase @see {@link modifierTokens}.
 * Final shortcut token should always be a base key. List of all base keys: @see {@link public/data/key-codes.json}.
 * As an exception, `(click)` can be used instead of base key to show mouse click.
 * Examples: 'ctrl+s', 'shift+cmd+e'.
 *
 * Shortcut macro or sequences of shortcuts are also supported and should be separated by space (' ').
 * Example: 'cmd+k cmd+s'
 */
export interface InputShortcut {
  title: string;
  key?: string;
  comment?: string;
}
