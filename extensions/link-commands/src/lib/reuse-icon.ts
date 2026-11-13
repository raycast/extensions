import { access, realpath } from "node:fs/promises";
import { join } from "node:path";
import { facetsOf } from "./convention";
import { slugify } from "./generate-script";
import { isRelativeIconFile } from "./resolve-icon";
import type { ScriptCommand } from "./types";

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

const canonical = async (path: string) => realpath(path).catch(() => path);

/**
 * The icon a command of this package already shows, if there is one.
 *
 * Probing for a file under the package's own asset key only finds icons this version wrote — a collection
 * that predates the package-level key filed each mark under the creating command's filename, which is not
 * derivable from the draft in hand. Asking the commands instead sidesteps the key entirely: whatever a
 * sibling declares is by definition the mark the list already shows for that brand, whether it was written
 * under the old scheme, the new one, or set by hand.
 *
 * Restricted to siblings in the same directory as the write target, because the reference is relative and
 * discovery recurses: a command found in a subdirectory resolves its own `./assets/…` against that
 * subdirectory, so copying its reference verbatim into a script one level up points at nothing. Both sides
 * are canonicalised first — discovery calls `realpath` and the directory preference does not, so a synced
 * or symlinked folder compares unequal as plain strings and the reuse silently never fires.
 */
export const reusableIcon = async (commands: ScriptCommand[], directory: string, packageName: string) => {
  const wanted = slugify(packageName);
  if (!wanted) return undefined;

  const target = await canonical(directory);

  const counts = new Map<string, number>();
  for (const command of commands) {
    if (slugify(facetsOf(command).brand ?? "") !== wanted) continue;
    if (!isRelativeIconFile(command.icon)) continue;
    if ((await canonical(command.directory)) !== target) continue;

    const reference = command.icon!.trim();
    counts.set(reference, (counts.get(reference) ?? 0) + 1);
  }

  // Most-used wins, as `learnedPackages` settles a host with more than one package: a brand whose commands
  // disagree about their mark has one the collection has actually converged on.
  const ranked = [...counts.entries()].sort(([, left], [, right]) => right - left);
  for (const [reference] of ranked) {
    if (await exists(join(target, reference))) return reference;
  }

  return undefined;
};
