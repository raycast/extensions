import { access, chmod, copyFile, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { moveEnvironmentToSubtitle } from "./move-environment";

const MAX_COPIES = 50;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

/**
 * The existing mode is preserved and the execute bits added, rather than the file being set to a flat 755.
 * A script deliberately kept private at 600 would otherwise become world-readable as a side effect of a
 * user asking only for it to become runnable.
 */
export const makeExecutable = async (path: string) => {
  const stats = await stat(path);
  await chmod(path, stats.mode | 0o111);
};

/**
 * Rewrites one script in place rather than writing a fresh file beside it: the filename is the command's
 * deeplink identifier, so renaming would break every link to it. The mode is restored explicitly after the
 * write, for the same reason `duplicateScript` copies it — a script that silently stopped being executable
 * would vanish from Raycast with no hint why.
 */
export const moveEnvironmentInScript = async (path: string) => {
  const contents = await readFile(path, "utf8");
  const rewritten = moveEnvironmentToSubtitle(contents);
  if (rewritten === contents) throw new Error("The title carries no environment to move");

  const stats = await stat(path);
  await writeFile(path, rewritten, "utf8");
  await chmod(path, stats.mode);
};

const freeCopyPath = async (directory: string, base: string, extension: string, index = 0): Promise<string> => {
  if (index > MAX_COPIES) throw new Error("There are already too many copies of this script");

  const suffix = index === 0 ? "-copy" : `-copy-${index + 1}`;
  const candidate = join(directory, `${base}${suffix}${extension}`);

  return (await exists(candidate)) ? freeCopyPath(directory, base, extension, index + 1) : candidate;
};

/**
 * A duplicate keeps the original's permissions because a copy of a runnable script that is not itself
 * runnable is invisible to Raycast, and the reason why is not discoverable from the list.
 */
export const duplicateScript = async (path: string) => {
  const extension = extname(path);
  const target = await freeCopyPath(dirname(path), basename(path, extension), extension);

  await copyFile(path, target);

  const stats = await stat(path);
  await chmod(target, stats.mode);

  return target;
};
