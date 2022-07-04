import { getPreferenceValues } from '@raycast/api';
import { createSpecifyApiAxiosInstance } from '../fetchers/fetcher';
import { Color, Bitmap, Vector } from '../types/tokens.types';
import { Repository } from '../types/repositories.types';
import { naturalSort } from '../utils/naturalSort.utils';

export const useSpecifyHttpApi = () => {
  const { personalAccessToken }: { personalAccessToken: string } = getPreferenceValues();

  const axiosInstance = createSpecifyApiAxiosInstance(personalAccessToken);

  const getRepositories = async () => {
    const { data } = await axiosInstance.get<Array<Repository>>('/repositories');

    return data?.length ? naturalSort<Repository>(data, { key: 'name' }) : [];
  };

  const getColors = async (namespace: string, repositoryName: string) => {
    const payload = {
      filter: {
        types: ['color'],
      },
      parsers: [
        {
          name: 'pick',
          options: {
            keys: ['name', 'value', 'id'],
          },
        },
      ],
    };
    const { data } = await axiosInstance.post<Array<Color> | null>(
      `/repository/${namespace}/${repositoryName}/design-tokens`,
      payload
    );

    return data?.length ? naturalSort<Color>(data, { key: 'name' }) : [];
  };

  const getBitmaps = async (namespace: string, repositoryName: string) => {
    const payload = {
      filter: {
        types: ['bitmap'],
      },
      parsers: [
        {
          name: 'pick',
          options: {
            keys: ['name', 'value', 'id'],
          },
        },
      ],
    };
    const { data } = await axiosInstance.post<Array<Bitmap> | null>(
      `/repository/${namespace}/${repositoryName}/design-tokens`,
      payload
    );

    return data?.length ? naturalSort<Bitmap>(data, { key: 'name' }) : [];
  };

  const getVectors = async (namespace: string, repositoryName: string) => {
    const payload = {
      filter: {
        types: ['vector'],
      },
      parsers: [
        {
          name: 'pick',
          options: {
            keys: ['name', 'value', 'id'],
          },
        },
      ],
    };
    const { data } = await axiosInstance.post<Array<Vector> | null>(
      `/repository/${namespace}/${repositoryName}/design-tokens`,
      payload
    );

    return data?.length ? naturalSort<Vector>(data, { key: 'name' }) : [];
  };

  return {
    getRepositories,
    getColors,
    getBitmaps,
    getVectors,
  };
};
