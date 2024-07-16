import { getPreferenceValues } from '@raycast/api';
import type { Preferences } from '../types';
import ImageKit from 'imagekit';
import { useRef } from 'react';

export const useImageKit = () => {
  const { publicKey, privateKey, urlEndpoint } =
    getPreferenceValues<Preferences>();

  const { current } = useRef(
    new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    }),
  );

  return current;
};
