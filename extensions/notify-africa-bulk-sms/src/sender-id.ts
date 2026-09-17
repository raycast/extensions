import { LocalStorage, showToast, Toast } from '@raycast/api';
import { useEffect, useState } from 'react';
import { requireSenderId } from './lib.js';

const PINNED_SENDER_ID_KEY = 'pinnedSenderId';

export function usePinnedSenderId() {
  const [senderId, setSenderId] = useState('');
  const [pinnedSenderId, setPinnedSenderId] = useState('');

  useEffect(() => {
    let isMounted = true;

    LocalStorage.getItem<string>(PINNED_SENDER_ID_KEY).then((value) => {
      if (isMounted && value) {
        setSenderId(value);
        setPinnedSenderId(value);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  async function pinSenderId() {
    let nextSenderId: string;
    try {
      nextSenderId = requireSenderId(senderId);
    } catch (caught) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Sender ID was not pinned',
        message:
          caught instanceof Error ? caught.message : 'Check the Sender ID.',
      });
      return;
    }

    await LocalStorage.setItem(PINNED_SENDER_ID_KEY, nextSenderId);
    setSenderId(nextSenderId);
    setPinnedSenderId(nextSenderId);
    await showToast({
      style: Toast.Style.Success,
      title: 'Sender ID pinned',
    });
  }

  async function clearPinnedSenderId() {
    await LocalStorage.removeItem(PINNED_SENDER_ID_KEY);
    setPinnedSenderId('');
    await showToast({
      style: Toast.Style.Success,
      title: 'Pinned Sender ID cleared',
    });
  }

  return {
    senderId,
    setSenderId,
    pinnedSenderId,
    pinSenderId,
    clearPinnedSenderId,
  };
}
