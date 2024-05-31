import { getPreferenceValues } from '@raycast/api';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';

const execAsync = promisify(exec);

async function envPath(): Promise<string> {
  const { stdout: path } = await execAsync('echo $PATH');
  const { customBrewPath } = getPreferenceValues();

  return [path.trim(), customBrewPath || '/opt/homebrew/bin'].join(':');
}

export async function pass(cmd: string, storeDir: string = ''): Promise<string> {
  const { stdout, stderr } = await execAsync(`pass ${cmd}`, {
    timeout: 10000,
    env: {
      ...process.env,
      PATH: await envPath(),
      PASSWORD_STORE_DIR: storeDir,
    },
  });

  if (stderr) {
    throw new Error(stderr);
  }
  return stdout;
}

export async function list(storeDir: string, subDir: string = ''): Promise<string[]> {
  let results: string[] = [];
  const currentDir = join(storeDir, subDir);
  const files = await readdir(currentDir);

  for (const file of files) {
    const path = join(storeDir, subDir, file);
    const stats = await stat(path);

    if (stats.isDirectory()) {
      const subDirFiles = await list(storeDir, join(subDir, file));
      results = results.concat(subDirFiles);
    } else if (extname(path) === '.gpg') {
      const result = relative(storeDir, path).replace('.gpg', '');
      results.push(result);
    }
  }

  return results;
}

export async function decrypt(path: string, storeDir: string): Promise<string> {
  return pass(path, storeDir);
}
