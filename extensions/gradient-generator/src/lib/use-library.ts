import { LocalStorage } from '@raycast/api';
import { useEffect, useState } from 'react';
import { Gradient } from '../types';
import { createLibrary, STORAGE_KEY } from './library';

export const library = createLibrary({
  get: () => LocalStorage.getItem<string>(STORAGE_KEY),
  set: (value) => LocalStorage.setItem(STORAGE_KEY, value),
});
const listeners = new Set<() => void>();
export const refreshLibrary = () => listeners.forEach((listener) => listener());

export function useLibrary() {
  const [items, setItems] = useState<Gradient[]>([]);
  const [error, setError] = useState<Error>();
  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    let active = true,
      request = 0;
    const refresh = () => {
      const current = ++request;
      setLoading(true);
      library
        .read()
        .then((value) => {
          if (active && current === request) {
            setItems(value);
            setError(undefined);
          }
        })
        .catch((reason: Error) => {
          if (active && current === request) setError(reason);
        })
        .finally(() => {
          if (active && current === request) setLoading(false);
        });
    };
    listeners.add(refresh);
    refresh();
    return () => {
      active = false;
      listeners.delete(refresh);
    };
  }, []);
  return { items, error, isLoading };
}
