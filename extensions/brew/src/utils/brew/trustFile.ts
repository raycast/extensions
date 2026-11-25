import { join } from "path";

/**
 * Where Homebrew 7 records trust (`brew trust`), for the environment brew runs
 * in. bin/brew picks the user config directory: `$XDG_CONFIG_HOME/homebrew`,
 * else `$HOMEBREW_XDG_CONFIG_HOME/homebrew`, else `~/.homebrew` (a variable set
 * but empty counts as unset), and trust/store.rb keeps `trust.json` in it.
 */
export function brewTrustFile(env: NodeJS.ProcessEnv): string {
  const dir = env.XDG_CONFIG_HOME
    ? join(env.XDG_CONFIG_HOME, "homebrew")
    : env.HOMEBREW_XDG_CONFIG_HOME
      ? join(env.HOMEBREW_XDG_CONFIG_HOME, "homebrew")
      : join(env.HOME ?? "", ".homebrew");
  return join(dir, "trust.json");
}
