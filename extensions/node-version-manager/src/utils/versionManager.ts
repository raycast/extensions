import preferences from './preferences';
import nvm from './managers/nvm';
import fnm from './managers/fnm';
import brew from './managers/brew';
import { NodeVersionsInfo } from '../types';

const versionManager = preferences.versionManager;

const getVersionManager = () => {
  switch (versionManager) {
    case 'nvm':
      return nvm;
    case 'fnm':
      return fnm;
    case 'brew':
      return brew;
    default:
      return {
        name: '',
        list: (): NodeVersionsInfo[] => [],
        listRemote: (): NodeVersionsInfo[] => [],
        install: (version: string) => {
          console.log('install', version);
        },
        uninstall: (version: string) => {
          console.log('uninstall', version);
        },
        default: (version: string) => {
          console.log('default', version);
        },
        isInstalled: false,
      };
  }
};

export default getVersionManager();
