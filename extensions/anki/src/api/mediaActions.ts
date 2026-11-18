import { ankiReq } from './ankiClient';

export default {
  getMediaDirPath: async (): Promise<string> => {
    return await ankiReq('getMediaDirPath');
  },
};
