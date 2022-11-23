import {
  getMe,
  login,
  getSubscriptionItems,
  getMyItemDetail,
  getCollectionItems,
  getItems,
  getUser,
  getCollections,
} from "./api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { Preference } from "./types";

export const useMe = () => {
  const { email, password } = getPreferenceValues<Preference>();

  return usePromise(async () => {
    let res;
    try {
      res = await getMe();
    } catch {
      // noop
    }

    if (res?.status === 200) {
      return res;
    }

    const { statusCode } = await login(email, password);

    if (statusCode === 200) {
      return getMe();
    } else {
      throw new Error("Login failed");
    }
  });
};

export const useUser = (userId: string) => {
  return useCachedPromise(getUser, [userId], {
    execute: !!userId,
  });
};

export const useCollections = (userId: string) => {
  return useCachedPromise(getCollections, [userId], {
    execute: !!userId,
  });
};

export const useSubscriptions = (page: number, execute: boolean) => {
  return useCachedPromise(getSubscriptionItems, [page], {
    execute,
  });
};

export const useMyItemDetail = (id: string) => {
  return useCachedPromise(getMyItemDetail, [id]);
};

export const useCollectionItems = (userId: string, collectionId: string) => {
  return useCachedPromise(getCollectionItems, [userId, collectionId]);
};

export const useItems = (page: number, execute: boolean) => {
  return useCachedPromise(getItems, [page], {
    execute,
  });
};
