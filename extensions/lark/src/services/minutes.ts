import { LocalStorage, Toast, showToast } from '@raycast/api';
import { RequestError } from 'got';
import { getDefaultStore } from 'jotai';
import { isAuthenticatedAtom } from '../hooks/atoms';
import { TENANT_DOMAIN } from '../utils/config';
import { client, cookieJar, isAbortError } from './shared';

enum SpaceName {
  Home = 1,
  MyContent = 2,
  SharedContent = 3,
  Trash = 4,
}

export interface SearchMinutesParams {
  query: string;
}

export interface RecentMinutesListResponse {
  size: number;
  has_more: boolean;
  list: MinuteItem[];
}

export interface MinuteItem {
  topic: string;
  url: string;
  /** in milliseconds */
  start_time: number;
  owner_name?: string;
  duration: number;
  object_token: string;
}

export interface SearchMinutesResponse {
  has_more: boolean;
  meetings: MinuteItem[];
}

const minutesClient = client.extend({
  prefixUrl: `${TENANT_DOMAIN}/minutes/api/`,
  headers: {
    Referer: TENANT_DOMAIN,
  },
  hooks: {
    afterResponse: [
      (response) => {
        const data = response.body as Record<string, unknown>;

        if (data.code !== 0) {
          if (data.code === 99991641) {
            // Login Required
            LocalStorage.clear();
            getDefaultStore().set(isAuthenticatedAtom, false);
            setTimeout(() => {
              showToast(Toast.Style.Failure, 'Session expired, please login again');
            });
          }
          throw Error(String(data.msg || ''));
        }
        response.body = data.data;
        return response;
      },
    ],
  },
});

export async function fetchRecentMinutesList(size: number, signal?: AbortSignal): Promise<RecentMinutesListResponse> {
  try {
    const { body } = await minutesClient.get<RecentMinutesListResponse>('space/list', {
      searchParams: {
        space_name: SpaceName.Home,
        rank: 1,
        asc: false,
        language: 'en_us',
        size,
      },
      signal,
    });
    return body;
  } catch (error) {
    let errorMessage = 'Could not load recent minutes';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }
    if (!isAbortError(error)) showToast(Toast.Style.Failure, errorMessage);
    return Promise.resolve({
      has_more: false,
      size: 0,
      list: [],
    });
  }
}

export async function searchMinutes(params: SearchMinutesParams, signal?: AbortSignal): Promise<SearchMinutesResponse> {
  try {
    const { body } = await minutesClient.get<SearchMinutesResponse>('search', {
      searchParams: {
        suggestion_limit: 5,
        size: 15,
        offset: 0,
        total_limit: true,
        language: 'en_us',
        ...params,
      },
      signal,
    });
    return body;
  } catch (error) {
    let errorMessage = 'Could not search minutes';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }
    if (!isAbortError(error)) showToast(Toast.Style.Failure, errorMessage);
    return Promise.resolve({
      has_more: false,
      meetings: [],
    });
  }
}

let csrfTokenPromise: Promise<Record<string, string | undefined>> | null = null;

async function getCsrfHeaders() {
  if (csrfTokenPromise) return await csrfTokenPromise;
  csrfTokenPromise = minutesClient
    .get(`../me`, { responseType: 'text' })
    .then((response) => {
      // It will not archive here due to a CSRF abort.
      throw new RequestError('', new Error(), response.request);
    })
    .catch(async (error) => {
      if (error instanceof RequestError) {
        const requestURL = error.request?.requestUrl?.toString() || TENANT_DOMAIN;
        const cookies = await cookieJar.getCookies(requestURL);
        const hashed = cookies.find((item) => item.key === 'm_e09b70')?.value;
        await cookieJar.setCookie(`m_e09b70=${hashed}`, requestURL);
        return {
          'Bv-Csrf-Token': cookies.find((item) => item.key === 'bv_csrf_token')?.value,
        };
      }
      return {};
    });
  return await csrfTokenPromise;
}

export async function removeRecentMinute(objToken: string): Promise<boolean> {
  try {
    await minutesClient.post('space/remove', {
      headers: await getCsrfHeaders(),
      form: {
        object_tokens: objToken,
        space_name: SpaceName.Home,
      },
    });

    return true;
  } catch (error) {
    let errorMessage = 'Could not remove the minute from recent list';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}${error.message ? ` (${error.message})` : ''}`;
    }

    showToast(Toast.Style.Failure, errorMessage);
    return false;
  }
}
