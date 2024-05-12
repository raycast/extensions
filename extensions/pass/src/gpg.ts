import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const execAsync = promisify(exec);
const envPath = execSync('echo $PATH').toString() + ':/opt/homebrew/bin';
const execOpts = {
  timeout: 5000,
  env: {
    ...process.env,
    PATH: envPath,
  },
};

export async function listFiles(dirPath: string): Promise<string[]> {
  let results: string[] = [];
  const files = await readdir(dirPath);

  for (const file of files) {
    const path = join(dirPath, file);
    const stats = await stat(path);

    if (stats.isDirectory()) {
      const subDirFiles = await listFiles(path);
      results = results.concat(subDirFiles);
    } else if (extname(path) === '.gpg') {
      results.push(path);
    }
  }

  return results;
}

export async function decrypt(path: string): Promise<string> {
  const cmd = `gpg --batch --yes -d ${path}`;
  const { stdout } = await execAsync(cmd, execOpts);
  return stdout;
}
