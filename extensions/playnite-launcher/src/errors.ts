export const PlayniteErrorCode = {
  EXTENSION_MISSING: "extension_missing",
  PLAYNITE_PATH_INVALID: "playnite_path_invalid",
  UNKNOWN_ERROR: "unknown_error",
} as const;
type PlayniteErrorCode = (typeof PlayniteErrorCode)[keyof typeof PlayniteErrorCode];

export class PlayniteError extends Error {
  constructor(
    public code: PlayniteErrorCode,
    public extra?: string,
  ) {
    super(`${code}${extra !== undefined ? `: ${extra}` : ""}`);
  }
}
