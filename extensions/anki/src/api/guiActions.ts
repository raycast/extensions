import { ankiReq } from './ankiClient';

export default {
  guiBrowse: async (query: string): Promise<void> => {
    return await ankiReq('guiBrowse', {
      query: query,
      reorderCards: {
        order: 'descending',
        columnId: 'noteCrt',
      },
    });
  },
};
