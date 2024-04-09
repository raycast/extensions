import { preferences } from '../utils/preferences';
import { useFetch } from '@raycast/utils';
import { Cast, CastAuthor, FeedCastsResponse, FeedUsersResponse } from '../utils/types';
import { ApiUrls } from '../utils/endpoints';
import { Toast, showToast } from '@raycast/api';

const headers = { accept: 'application/json', api_key: preferences.apiKey };

export function useTrendingCasts(timeWindow: string) {
  return useFetch<FeedCastsResponse>(({ cursor }) => ApiUrls.getTrendingCasts(timeWindow, cursor), {
    method: 'GET',
    headers: headers,
    execute: !!timeWindow,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, 'Could not fetch trending casts');
    },
    mapResult(result: FeedCastsResponse) {
      return {
        data: result?.casts as Cast[],
        hasMore: !!result.next.cursor,
        cursor: result?.next.cursor,
      };
    },
  });
}

function getProfileByFIDOrUsername(q: string, cursor?: string) {
  let url: string;
  if (/^[0-9]/.test(q)) {
    url = ApiUrls.getUserFid(q, cursor);
  } else {
    url = ApiUrls.getProfilesByUsername(q, cursor);
  }
  return url;
}

export function useGetProfiles(query: string) {
  return useFetch<FeedUsersResponse>(({ cursor }) => getProfileByFIDOrUsername(query, cursor), {
    method: 'GET',
    headers: headers,
    execute: !!query,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, 'Could not fetch profiles');
    },
    mapResult(result: FeedUsersResponse) {
      const rootResult = result?.result ?? result;
      return {
        data: rootResult?.users as CastAuthor[],
        hasMore: !!rootResult?.next?.cursor,
        cursor: rootResult?.next?.cursor,
      };
    },
  });
}

/** includes casts and recasts by the author */
export function useGetProfileCasts(fids: number) {
  return useFetch<FeedCastsResponse>(({ cursor }) => ApiUrls.getProfileCasts(fids, cursor), {
    method: 'GET',
    headers: headers,
    execute: !!fids,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, `Could not fetch profile casts`);
    },
    mapResult(result: FeedCastsResponse) {
      return {
        data: result?.casts as Cast[],
        hasMore: !!result.next.cursor,
        cursor: result?.next.cursor,
      };
    },
  });
}
