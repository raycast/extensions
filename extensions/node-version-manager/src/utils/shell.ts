import { spawnSync } from 'node:child_process';
import { env } from './common';

const run = <T extends object | string>(fullCommand: string, parseOutput?: (op: string) => T): T => {
  const [command, ...args] = fullCommand.split(' ');
  const { stdout, stderr } = spawnSync(command, args, {
    env: env(),
    shell: '/bin/zsh',
  });

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    throw new Error(stderr.toString());
  }

  const output = stdout.toString().trim();

  if (parseOutput) {
    return parseOutput(output);
  }

  return output as T;
};

const source = (path: string) => {
  return run(`source ${path}`);
};

const which = (command: string) => {
  return run(`which ${command}`);
};

const commandExists = (command: string) => {
  return !!which(command);
};

export default {
  which,
  commandExists,
  source,
  run,
};
