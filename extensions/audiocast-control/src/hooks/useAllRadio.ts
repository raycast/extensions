import { useRef } from 'react';
import { usePromise } from '@raycast/utils';
import { getAll } from '../lib/radioDB';
import { initDB } from '../lib/db';

export function useAllRadio() {
  const abortable = useRef<AbortController | null>(null);

  return usePromise(
    async () => {
      await initDB(abortable.current?.signal);

      return getAll(abortable.current?.signal);
    },
    [],
    {
      abortable
    }
  );
}
