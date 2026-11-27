import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

export function getTerminusCommand(terminusPath: string | undefined) {
  if (terminusPath) {
    return { file: terminusPath, env: undefined };
  }

  const home = homedir();
  const composerPaths = [join(home, ".config/composer/vendor/bin"), join(home, ".composer/vendor/bin")].filter((path) =>
    existsSync(join(path, "terminus")),
  );
  const PATH = [
    ...composerPaths,
    "/opt/homebrew/bin",
    "/opt/homebrew/sbin",
    process.env.PATH,
    "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
  ]
    .filter(Boolean)
    .join(delimiter);

  return { file: "terminus", env: { PATH } };
}
