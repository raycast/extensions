import { ankiReq } from './ankiClient';

export default {
  getMediaDirPath: async (): Promise<void> => {
    return await ankiReq('getMediaDirPath');
  },
};
