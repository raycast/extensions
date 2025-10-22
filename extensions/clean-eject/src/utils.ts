import { Icon } from '@raycast/api';

import type { Volume } from './types';

export const parseVolumes = (data?: string): Volume[] => {
  if (!data?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (v): v is Volume =>
        v && typeof v === 'object' && 'id' in v && 'path' in v,
    );
  } catch {
    return [];
  }
};

export const getVolumeIcon = (volume: Volume): string => {
  if (!volume.isRemovable) {
    return Icon.HardDrive;
  }

  return volume.protocol === 'Secure Digital'
    ? Icon.MemoryChip
    : Icon.MemoryStick;
};
