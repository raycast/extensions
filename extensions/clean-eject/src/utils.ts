import { Icon, showToast, Toast } from '@raycast/api';
import fs from 'fs';
import path from 'path';

import type { Volume } from './types';

export const parseVolumes = (data?: string): Volume[] => {
  if (typeof data !== 'string' || !data.trim()) {
    return [];
  }

  return data.split('\n').reduce<Volume[]>((acc, line) => {
    line = line.trim();

    if (!line.startsWith('{') || !line.endsWith('}')) {
      return acc;
    }

    try {
      const obj = JSON.parse(line);

      if (
        obj &&
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        typeof obj.path === 'string' &&
        typeof obj.format === 'string' &&
        typeof obj.protocol === 'string' &&
        typeof obj.size === 'string' &&
        typeof obj.isRemovable === 'boolean'
      ) {
        acc.push(obj);
      }

      // eslint-disable-next-line no-empty
    } catch {}

    return acc;
  }, []);
};

export const getVolumeIcon = (volume: Volume): string => {
  if (!volume.isRemovable) {
    return Icon.HardDrive;
  }

  return volume.protocol === 'Secure Digital'
    ? Icon.MemoryChip
    : Icon.MemoryStick;
};

export const isVolumeCleanable = (volume: Volume): boolean => {
  const spotlightDir = path.join(volume.path, '.Spotlight-V100');

  if (!fs.existsSync(spotlightDir)) {
    return true;
  }

  try {
    fs.accessSync(spotlightDir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

export const showMissingPermissionToast = async (): Promise<void> => {
  await showToast({
    style: Toast.Style.Failure,
    title: 'Missing permission',
    message: 'Please grant Raycast Full Disk Access in System Settings.',
  });
};
