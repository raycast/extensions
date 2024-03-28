import { preferences } from '../utils/preferences';
import { useFetch } from '@raycast/utils';
import { FeedCastsResponse, FeedUsersResponse } from '../utils/types';
import { ApiUrls } from '../utils/endpoints';
import { Toast, showToast } from '@raycast/api';

export function useTrendingCasts(cursor?: string) {
  const { data, isLoading, pagination } = useFetch<FeedCastsResponse>(ApiUrls.getTrendingCasts(1, cursor), {
    method: 'GET',
    headers: { accept: 'application/json', api_key: preferences.apiKey },
  });

  return { data, isLoading, pagination };
}

export function useGetProfiles(query?: string, cursor?: string) {
  let url: string;
  const startsWithNumber = /^[0-9]/.test(query || '');
  if (query && startsWithNumber) {
    url = ApiUrls.getUserFids(query, cursor);
    console.log(url);
  } else {
    url = ApiUrls.getUsers(cursor);
  }

  const { data, isLoading, pagination } = useFetch<FeedUsersResponse>(url, {
    method: 'GET',
    headers: { accept: 'application/json', api_key: preferences.apiKey },
    execute: !!query,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, 'Could not fetch profiles');
    },
    // keepPreviousData: true,
  });
  console.log('data', data);

  return { data, isLoading, pagination };
}
