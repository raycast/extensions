import { getMe, login, getSubscriptionItems, getMyItemDetail } from "./api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getPreferenceValues } from "@raycast/api";
import { Preference } from "./types";

export const useMe = () => {
  const { email, password } = getPreferenceValues<Preference>();

  return usePromise(async () => {
    const res = await getMe();

    if (res.statusCode === 200) {
      console.log("yeah already login");
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

export const useSubscriptions = (page: number, execute: boolean) => {
  return useCachedPromise(getSubscriptionItems, [page], {
    execute,
  });
};

export const useMyItemDetail = (id: string) => {
  return useCachedPromise(getMyItemDetail, [id]);
};
