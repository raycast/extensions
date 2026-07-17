import { environment, getPreferenceValues } from '@raycast/api';

const { apiKey, apiSecret, accountType } = getPreferenceValues<Preferences>();
export const endpoint = ['https://', accountType === 'paper' ? 'paper-api' : 'api', '.alpaca.markets/v2'].join('');

const { extensionName, commandName } = environment;
export const headers = {
  'APCA-API-KEY-ID': apiKey,
  'APCA-API-SECRET-KEY': apiSecret,
  Accept: 'application/json',
  'User-Agent': `raycast/ext/${extensionName}/${commandName}`,
};
