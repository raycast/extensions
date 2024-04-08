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

// function fetchUser(q?: string) {
//   let url: string;
//   if (q) {
//     if (/^[0-9]/.test(q)) {
//       url = ApiUrls.getUserFids(q);
//     } else {
//       url = ApiUrls.getProfilesByUsername(q, VIEWER_FID);
//     }
//   } else {
//     url = ApiUrls.getPowerUsers();
//   }
//   return url;
// }

export function useGetProfiles(query: string) {
  // pagination isnt' working here
  return useFetch<FeedUsersResponse>(({ cursor }) => ApiUrls.getProfilesByUsername(query, cursor), {
    method: 'GET',
    headers: headers,
    execute: !!query,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, 'Could not fetch profiles');
    },
    mapResult(result: FeedUsersResponse) {
      console.log('🚀 ~ mapResult ~ result:', result.result?.next.cursor);
      return {
        data: result.result?.users as CastAuthor[],
        hasMore: !!result.result.next.cursor,
        cursor: result.result?.next.cursor,
      };
    },
  });
}
