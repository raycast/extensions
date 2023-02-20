import { LocalStorage } from "@raycast/api";

export const setItem = async <U>(key: string, value: U, expiredTime = 1000 * 60 * 60 * 24 * 7) => {
  const now = new Date();
  const item = {
    value,
    createdAt: now.getTime(),
    expiredTime: now.getTime() + expiredTime,
  };
  await LocalStorage.setItem(key, JSON.stringify(item));
};

export const getItem = async <U>(key: string, skipValidate = false) => {
  const item = await LocalStorage.getItem<string>(key);
  if (!item) {
    return null;
  }
  const { value, createdAt, expiredTime } = JSON.parse(item);
  if (!skipValidate && expiredTime < new Date().getTime()) {
    return null;
  }
  return {
    value,
    createdAt,
  } as { value: U; createdAt: number };
};

export const removeAllItems = async () => {
  await LocalStorage.clear();
};
