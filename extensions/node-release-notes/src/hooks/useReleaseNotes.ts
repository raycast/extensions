import { useFetch } from '@raycast/utils';
import { NODE_RELEASES_GITHUB_BASE_URL } from '../config';

export function useReleaseNotes(version: string) {
  return useFetch<{ body: string; html_url: string; published_at: string; name: string }>(
    `${NODE_RELEASES_GITHUB_BASE_URL}/tags/${version}`,
  );
}
