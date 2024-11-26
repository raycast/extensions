import { ankiReq } from './ankiClient';

export default {
  sync: async (): Promise<void> => {
    await ankiReq('sync');
  },
};
