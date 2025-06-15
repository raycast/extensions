import { LocalStorage } from '@raycast/api';
import { nanoid } from 'nanoid';
import { Resource } from '../types/resource';
import resources from '../data/resources.json';

export const getResources = async () => {
  try {
    const storedData = await LocalStorage.getItem<string>('storedData');

    if (!storedData) {
      throw new Error('No resources found');
    }

    return JSON.parse(storedData) as Resource[];
  } catch (error) {
    const initData = [
      ...resources.applications.map(app => ({ ...app, id: nanoid(), type: 'application' })),
      ...resources.websites.map(website => ({ ...website, id: nanoid(), type: 'website' })),
    ];

    await LocalStorage.setItem('storedData', JSON.stringify(initData));

    return initData as Resource[];
  }
};

export const setResources = async (resources: Resource[]) => {
  await LocalStorage.setItem('storedData', JSON.stringify(resources));
};

export default {
  getResources,
  setResources,
};
