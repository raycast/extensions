import { ankiReq } from './ankiClient';

export default {
  getCollectionStatsHTML: async (): Promise<string | undefined> => {
    return await ankiReq('getCollectionStatsHTML', {
      wholeCollection: true,
    });
  },
};
