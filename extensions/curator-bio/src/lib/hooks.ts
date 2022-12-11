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
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { checkLoginCredentials } from "./utils";
import { getPreferences } from "./preference";

export const useUserId = (userId?: string) => {
  const [id, setId] = useCachedState<string | undefined>("userId", userId);

  useEffect(() => {
    setId(userId);
  }, [userId]);

  return id;
};

export const useMe = () => {
  const { email, password } = getPreferences();

  const useMeData = usePromise(async () => {
    await checkLoginCredentials();

    let res;
    try {
      res = await getMe();
    } catch {
      // noop
    }

    if (res?.status === 200) {
      return res;
    }

    try {
      const { status } = await login(email, password);

      if (status === 200) {
        return getMe();
      } else {
        throw new Error("loginError");
      }
    } catch (error) {
      throw new Error("loginError");
    }
  });

  const userId = useMemo(() => {
    return useMeData?.data?.data?.id;
  }, [useMeData?.data]);

  const cachedUserId = useUserId(userId);

  return {
    ...useMeData,
    userId: cachedUserId,
  };
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
