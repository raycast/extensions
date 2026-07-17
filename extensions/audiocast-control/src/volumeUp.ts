import { closeMainWindow, showHUD } from '@raycast/api';
import { getDeviceUrl } from './lib/discover';
import { volumeUp } from './api/player';
import { cache } from './lib/cache';
import { createLog } from './lib/debug';

const log = createLog('volumeUp');

export default async () => {
  try {
    closeMainWindow();

    const playerUrl = await getDeviceUrl();

    const newVolume = await volumeUp(playerUrl);

    log.log(`Volume upped to ${newVolume}`);

    showHUD(`${cache.deviceName} volume was upped to ${newVolume}`);
  } catch (error) {
    log.error(`Failed to increase volume: ${(<Error>error).message}`);
    showHUD('Failed to increase volume');
  }
};
