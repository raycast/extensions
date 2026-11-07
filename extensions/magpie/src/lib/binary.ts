import { homedir } from "node:os";

import { MagpieNotFound } from "./errors";

const DEFAULT_PATH = "~/.local/bin/magpie";

/**
 * Expand a magpie binary path.
 * Only a leading `~` and the `$HOME` / `${HOME}` tokens are replaced, with the
 * home directory passed in. Nothing is sent through a shell.
 */
export function resolveBinary(
  raw: string | undefined,
  home = homedir(),
): string {
  const input = (raw ?? "").trim() || DEFAULT_PATH;
  if (input.includes("\0")) {
    throw new MagpieNotFound("Magpie path contains a null byte");
  }

  const root = home.replace(/\/+$/, "");
  let expanded = input.replaceAll("${HOME}", root).replaceAll("$HOME", root);
  expanded = expanded.replace(/^~(?=$|\/)/, root);

  if (!expanded.startsWith("/")) {
    throw new MagpieNotFound(
      `Magpie path must be absolute after expanding ~ and $HOME: ${input}`,
    );
  }
  return expanded;
}
