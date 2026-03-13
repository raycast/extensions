import { Model } from '../types';
import { delay } from '../util';
import { ankiReq } from './ankiClient';

export default {
  getModels: async (): Promise<Model[] | undefined> => {
    const modelNames: string[] = await ankiReq('modelNames');

    await delay(1);

    const models: Model[] = await ankiReq('findModelsByName', {
      modelNames: modelNames,
    });

    return models;
  },
};
