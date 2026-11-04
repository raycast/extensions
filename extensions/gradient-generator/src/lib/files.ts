import {
  lstat,
  open,
  rename,
  link,
  unlink,
  realpath,
  stat,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function validateFilename(
  name: string,
  extension: 'png' | 'svg' | 'json',
) {
  if (
    !name ||
    name !== name.trim() ||
    /[<>:"/\\|?*]/.test(name) ||
    [...name].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) ||
    /[. ]$/.test(name) ||
    name === '.' ||
    name === '..' ||
    Buffer.byteLength(name) > 240
  )
    throw new Error(
      'Use a filename without paths, reserved characters, or trailing spaces/dots (maximum 240 bytes)',
    );
  if (/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name))
    throw new Error('This filename is reserved on Windows');
  if (
    !name.toLowerCase().endsWith(`.${extension}`) ||
    name.length <= extension.length + 1
  )
    throw new Error(`Use a filename ending in .${extension}`);
  return name;
}

export function exportDirectory(value?: string) {
  const input = value?.trim() || path.join(homedir(), 'Downloads');
  const expanded = /^~[/\\]/.test(input)
    ? path.join(homedir(), input.slice(2))
    : input;
  if (!path.isAbsolute(expanded))
    throw new Error(
      'Choose an absolute export directory in extension preferences',
    );
  return expanded;
}
async function existing(file: string) {
  try {
    return await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
function sameFile(
  a: Awaited<ReturnType<typeof existing>>,
  b: Awaited<ReturnType<typeof existing>>,
) {
  return (
    a?.dev === b?.dev &&
    a?.ino === b?.ino &&
    a?.mtimeMs === b?.mtimeMs &&
    a?.size === b?.size &&
    a?.ctimeMs === b?.ctimeMs
  );
}

// Generate into a same-directory temporary file. Never truncate the destination
// on render/write failure. New-file publication is exclusive, including races.
export async function exportFile(options: {
  directory?: string;
  filename: string;
  extension: 'png' | 'svg' | 'json';
  generate: () => Promise<Buffer | string>;
  confirmOverwrite: (file: string) => Promise<boolean>;
}): Promise<boolean> {
  const name = validateFilename(options.filename, options.extension);
  const directory = await realpath(exportDirectory(options.directory));
  if (!(await stat(directory)).isDirectory())
    throw new Error('Choose an existing export directory');
  const target = path.join(directory, name);
  const before = await existing(target);
  if (before && !before.isFile())
    throw new Error(
      'Destination is not a regular file; choose another filename',
    );
  if (before && !(await options.confirmOverwrite(target))) return false;
  const data = await options.generate();
  const temporary = path.join(directory, `.gradient-${randomUUID()}.tmp`);
  let created = false;
  const cleanup = async () => {
    try {
      await unlink(temporary);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  };
  try {
    const file = await open(temporary, 'wx', 0o600);
    created = true;
    try {
      await file.writeFile(data);
      await file.sync();
    } finally {
      await file.close();
    }
    if (!sameFile(before, await existing(target)))
      throw new Error(
        'Destination changed during export. Try again and review the replacement.',
      );
    if (before) await rename(temporary, target);
    else await link(temporary, target);
    return true;
  } finally {
    if (created) {
      await cleanup();
    }
  }
}
