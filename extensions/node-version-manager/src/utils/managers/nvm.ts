import { spawnSync } from 'node:child_process';
import preferences from '../preferences';

import { NodeVersionsInfo } from '../../types';

const checkNvmIsInstalled = () => {
  if (preferences.versionManager === 'nvm') {
    const { stdout } = spawnSync('source ~/.zshrc; command -v nvm', { shell: '/bin/zsh' });
    if (stdout.length === 0) {
      console.error('nvm is not installed');
      return false;
    }
    return true;
  }
};

const formatVersions = (versions: string[]): NodeVersionsInfo[] => {
  const regex = /v\d+\.\d+\.\d+|system/g;
  const result = versions
    .map((version) => {
      const matches = version.match(regex);
      if (!matches) {
        return null;
      }
      const title = matches[0];
      const type = version.includes('->') ? 'default' : null;
      const group = title.startsWith('v') ? `v${title.split('.')[0].slice(1)}.x` : title;
      return { title, type, group };
    })
    .filter((item) => item !== null);

  return result as NodeVersionsInfo[];
};

const nvmList = (): NodeVersionsInfo[] => {
  const { stdout, stderr } = spawnSync('source ~/.zshrc; nvm ls --no-alias', { shell: '/bin/zsh' });

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    return [];
  }
  const output = stdout.toString().trim();

  if (output) {
    const versions = output.split('\n');

    const result = formatVersions(versions);

    return result.reverse();
  }
  return [];
};

const nvmListRemote = (): NodeVersionsInfo[] => {
  const { stdout, stderr } = spawnSync('source ~/.zshrc; nvm ls-remote', { shell: '/bin/zsh' });

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    return [];
  }
  const output = stdout.toString().trim();
  if (output) {
    const versions = output.split('\n');

    const result = formatVersions(versions);

    return result.reverse();
  }
  return [];
};

const nvmInstall = (version: string) => {
  const { stdout, stderr } = spawnSync(`source ~/.zshrc; nvm install ${version}`, { shell: '/bin/zsh' });

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    if (error.includes('Setting locale failed.')) {
      return '';
    }
    throw new Error(error);
  }

  const output = stdout.toString().trim();
  return output;
};

const nvmUninstall = (version: string) => {
  const { stdout, stderr } = spawnSync(`source ~/.zshrc; nvm uninstall ${version}`, { shell: '/bin/zsh' });

  if (stderr.length > 0) {
    const error = stderr.toString();
    console.error(error);
    return '';
  }

  const output = stdout.toString().trim();
  return output;
};

const nvmDefault = (version: string) => {
  const { stdout, stderr } = spawnSync(`source ~/.zshrc; nvm alias default ${version}`, { shell: '/bin/zsh' });

  if (stderr.length > 0) {
    const error = stderr.toString().trim();
    console.error(error);
    throw new Error(error);
  }

  const output = stdout.toString().trim();
  return output;
};

export default {
  name: 'nvm',
  list: nvmList,
  listRemote: nvmListRemote,
  install: nvmInstall,
  uninstall: nvmUninstall,
  default: nvmDefault,
  isInstalled: checkNvmIsInstalled(),
};
