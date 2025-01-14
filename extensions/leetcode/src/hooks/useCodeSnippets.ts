import { useFetch } from '@raycast/utils';
import { endpoint, getCodeSnippetsQuery } from '../api';
import { CodeSnippet, GetCodeSnippetsResponse } from '../types';

export function useCodeSnippets(titleSlug: string | undefined) {
  return useFetch<GetCodeSnippetsResponse, undefined, CodeSnippet[]>(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: getCodeSnippetsQuery,
      variables: {
        titleSlug: titleSlug || '',
      },
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    mapResult(result) {
      return {
        data: result.data.question.codeSnippets,
      };
    },
    execute: !!titleSlug,
  });
}
