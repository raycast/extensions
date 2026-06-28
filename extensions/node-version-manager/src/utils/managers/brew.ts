import preferences from '../preferences';
import { NodeVersionsInfo } from '../../types';
import shell from '../shell';
import { showToast, Toast } from '@raycast/api';

const validatePackageName = (name: string) => {
  const re = /^node@[0-9]{2}/;

  if (!re.test(name)) {
    throw new Error('brew expects the version on the format node@version, only a few versions are supported by brew');
  }
};

const brewIsSelectedInPrefs = () => {
  return preferences.versionManager === 'brew';
};
const checkBrew = () => {
  try {
    return shell.commandExists('brew');
  } catch (e) {
    return false;
  }
};

const shouldUseBrew = () => {
  return brewIsSelectedInPrefs() && checkBrew();
};

const brewList = (): NodeVersionsInfo[] => {
  try {
    const output = shell.run('brew list --versions | grep node', (output) => output.split('\n'));

    return output.map((pkg) => {
      const [pkgName, versionInfo] = pkg.split(' ');

      return {
        title: `v${versionInfo}`,
        type: pkgName, // show packageName as a card,
        group: 'Installed',
      };
    });
  } catch (e) {
    console.log(e);

    showToast({
      style: Toast.Style.Failure,
      title: 'unknown error',
      message: 'something went wrong',
    });
  }

  return [];
};

const brewListRemote = (): NodeVersionsInfo[] => {
  const versions = shell.run(`brew search '/^node(@[0-9]*)?$/'`, (output) =>
    output
      .replaceAll(/\n/g, ' ')
      .replaceAll(/\s{2,}/g, ' ')
      .split(' '),
  );

  return versions.map((v) => ({
    title: v,
    type: v,
    group: 'Remote',
  }));
};

const brewInstall = (pkg: string) => {
  return shell.run(`brew install ${pkg}`);
};

const brewUninstall = (version: string) => {
  const localNodePackages = brewList();

  const versionInfo = localNodePackages.find((p) => p.title === version);

  if (!versionInfo) {
    const msg = `couldn't find version to uninstall, ${versionInfo}`;
    console.log(msg);
    throw new Error(msg);
  }

  shell.run(`brew uninstall ${versionInfo.type}`);
};

const brewDefault = (version: string) => {
  validatePackageName(version);

  shell.run(`brew link --overwrite ${version}`);
};

export default {
  name: 'brew',
  list: brewList,
  listRemote: brewListRemote,
  install: brewInstall,
  uninstall: brewUninstall,
  default: brewDefault,
  isInstalled: shouldUseBrew(),
};
