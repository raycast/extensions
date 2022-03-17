import { useState, useEffect, useRef } from 'react';

import { resolve } from 'path';
import { environment } from '@raycast/api';
import { LocalStorage } from 'node-localstorage';

const location = resolve(environment.supportPath, 'local-storage');
const localStorage = new LocalStorage(location);

/**
 * Saves and retrieves data to and from localStorage
 * @param {string} key
 * @param {any} initalValue
 * @param {{serialize: (any) => string, deserialize: (string) => any}}
 * serializeOptions
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
 */

type UseLocalStorage = <T>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (serializedValue: string) => T;
  }
) => [state: T, setState: React.Dispatch<T>];

const useLocalStorage: UseLocalStorage = (
  key: string,
  initalValue,
  { serialize = JSON.stringify, deserialize = JSON.parse } = {}
) => {
  const [state, setState] = useState(() => {
    const storedValue = localStorage.getItem(key);
    try {
      if (storedValue) return deserialize(storedValue);

      return typeof initalValue === 'function' ? initalValue() : initalValue;
    } catch (error) {
      console.error(error);
      return initalValue;
    }
  });

  const prevKeyRef = useRef(key);
  useEffect(() => {
    const prevKey = prevKeyRef.current;
    if (prevKey !== key) {
      localStorage.removeItem(prevKey);
      prevKeyRef.current = key;
    }

    localStorage.setItem(key, serialize(state));
    prevKeyRef.current = key;
  }, [key, serialize, state]);

  return [state, setState];
};

export { useLocalStorage };
