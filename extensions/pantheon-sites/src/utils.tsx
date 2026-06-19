// Shell fragment that adds common terminus install locations to PATH.
// Each line is a no-op if the path doesn't exist, so all install methods are supported:
//   - Homebrew (Intel: /usr/local, Apple Silicon: /opt/homebrew)
//   - Composer global (~/.composer or ~/.config/composer)
//   - Any path set via the terminusPath preference
const TERMINUS_PATH_SETUP = [
  `eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null`,
  `[ -f "$HOME/.composer/vendor/bin/terminus" ] && export PATH="$HOME/.composer/vendor/bin:$PATH"`,
  `[ -f "$HOME/.config/composer/vendor/bin/terminus" ] && export PATH="$HOME/.config/composer/vendor/bin:$PATH"`,
].join("; ");

/**
 * Build a shell command that runs terminus with the given args.
 *
 * @param terminusPath - Optional full path to the terminus binary from preferences.
 *                       When provided it is used directly, skipping auto-detection.
 *                       When empty the function tries all common install locations.
 * @param args         - terminus sub-command and arguments, e.g. "site:list --format=json"
 */
export function terminusCmd(terminusPath: string | undefined, args: string): string {
  if (terminusPath) {
    return `${terminusPath} ${args}`;
  }
  return `(${TERMINUS_PATH_SETUP}; terminus ${args})`;
}
