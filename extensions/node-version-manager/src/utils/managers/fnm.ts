import { spawnSync } from 'node:child_process';
import preferences from '../preferences';

import { NodeVersionsInfo } from '../../types';
import { env } from '../common';

const getFnmPath = () => {
  if (preferences.versionManager === 'fnm') {
    const { stdout, stderr } = spawnSync('which', ['fnm'], {
      env: env(),
    });

    if (stderr.length > 0) {
      const error = stderr.toString();
      console.error(error);
      return '';
    }

    const output = stdout.toString().trim();

    return output;
  }
  return '';
};

const fnmPath = getFnmPath();

const checkFnmIsInstalled = () => {
  if (preferences.versionManager === 'fnm') {
    if (!fnmPath) {
      console.error('fnm is not installed');
      return false;
    }
    return true;
  }
};

const fnmList = (): NodeVersionsInfo[] => {
  const { stdout, stderr } = spawnSync(fnmPath, ['list']);

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    return [];
  }

  const output = stdout.toString().trim();
  if (output) {
    const versions = output.split('\n');

    const result = versions
      .map((nodeVersion) => {
        const [, title, type] = nodeVersion.split(' ');

        if (title === 'system') return null;

        return { title, type: type || null, group: title.replace(/\.\d+\.\d+$/, '.x') || 'none' } as NodeVersionsInfo;
      })
      .filter(Boolean) as NodeVersionsInfo[];

    return result.reverse();
  }
  return [];
};

const fnmListRemote = (): NodeVersionsInfo[] => {
  const { stdout, stderr } = spawnSync(fnmPath, ['list-remote']);

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    return [];
  }

  const output = stdout.toString().trim();
  if (output) {
    const versions = output.split('\n');

    const result = versions
      .map((nodeVersion) => {
        const [title, type] = nodeVersion.split(' ');

        return { title, type: type || null, group: title.replace(/\.\d+\.\d+$/, '.x') || 'none' } as NodeVersionsInfo;
      })
      .filter(Boolean);

    return result.reverse();
  }
  return [];
};

const fnmInstall = (version: string) => {
  const { stdout, stderr } = spawnSync(fnmPath, ['install', version]);

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    throw new Error(error);
  }

  const output = stdout.toString().trim();
  return output;
};

const fnmUninstall = (version: string) => {
  const { stdout, stderr } = spawnSync(fnmPath, ['uninstall', version]);

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    throw new Error(error);
  }

  const output = stdout.toString().trim();
  return output;
};

const fnmDefault = (version: string) => {
  const { stdout, stderr } = spawnSync(fnmPath, ['default', version]);
  console.log(stderr.toString());

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    throw new Error(error);
  }

  const output = stdout.toString().trim();
  return output;
};

export default {
  name: 'fnm',
  list: fnmList,
  listRemote: fnmListRemote,
  install: fnmInstall,
  uninstall: fnmUninstall,
  default: fnmDefault,
  isInstalled: checkFnmIsInstalled(),
};
