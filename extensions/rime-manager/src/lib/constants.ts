export const MANAGED_PIN_START = "# >>> Raycast Rime Manager: pinned candidates";
export const MANAGED_PIN_END = "# <<< Raycast Rime Manager: pinned candidates";
export const MANAGED_BLOCK_FILTER_START = "# >>> Raycast Rime Manager: blocked candidates filter";
export const MANAGED_BLOCK_FILTER_END = "# <<< Raycast Rime Manager: blocked candidates filter";
export const MANAGED_LOWER_FILTER_START = "# >>> Raycast Rime Manager: restore candidate order filter";
export const MANAGED_LOWER_FILTER_END = "# <<< Raycast Rime Manager: restore candidate order filter";

export const PIN_FILTER_LUA_NAME = "raycast_pin_cand_filter.lua";
export const BLOCK_FILTER_LUA_NAME = "raycast_blocked_words_filter.lua";
export const BLOCKED_WORDS_FILE_NAME = "raycast_blocked_words.txt";
export const LOWER_FILTER_LUA_NAME = "raycast_restore_candidate_order_filter.lua";
export const LOWERED_WORDS_FILE_NAME = "raycast_lowered_words.txt";

export const COMMON_SQUIRREL_PATHS = ["/Library/Input Methods/Squirrel.app", "/Applications/Squirrel.app"] as const;
