import { endpoint, headers } from '@api/fetch';
import { Position } from '@api/positions';
import { useFetch } from '@raycast/utils';

export const usePositions = () => {
  const { isLoading, data, revalidate, error } = useFetch(`${endpoint}/positions`, { headers, method: 'GET', initialData: [] });
  const positions = data as Position[];

  return {
    isLoading: (!data && !error) || isLoading,
    positions,
    revalidate,
    error,
  };
};
