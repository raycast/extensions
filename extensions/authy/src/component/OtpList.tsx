import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addToCache,
  APPS_KEY,
  checkIfCached,
  DEVICE_ID,
  getFromCache,
  RECENTLY_USED,
  SECRET_SEED,
  SERVICES_KEY,
} from "../cache";
import { AuthyApp, Services } from "../client/dto";
import { decryptSeed, genTOTP } from "../util/utils";
import { encode } from "hi-base32";
import { generateTOTP } from "../util/totp";
import { compareByDate, compareByName, toId } from "../util/compare";
import { getAuthyApps, getServices } from "../client/authy-client";
import { Otp } from "./OtpListItem";
import OtpListItems from "./OtpListItems";

const { preferCustomName } = getPreferenceValues<{ preferCustomName: boolean }>();

export const CORRUPTED = "corrupted";

export function OtpList(props: { isLogin: boolean | undefined; setLogin: (login: boolean) => void }) {
  const [otpList, setOtpList] = useState<Otp[]>([]);

  async function refresh(): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Authy",
      message: "Refreshing",
    });
    await toast.show();
    setOtpList([]);
    try {
      const { authyId } = getPreferenceValues<{ authyId: number }>();
      const deviceId: number = await getFromCache(DEVICE_ID);
      const secretSeed: string = await getFromCache(SECRET_SEED);
      // get authy apps
      const authyApp = await getAuthyApps(authyId, deviceId, genTOTP(secretSeed));
      await addToCache(APPS_KEY, authyApp);
      // get 3rd party services
      const services = await getServices(authyId, deviceId, genTOTP(secretSeed));
      await addToCache(SERVICES_KEY, services);
    } catch (error) {
      if (error instanceof Error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authy",
          message: error.message,
        });
        return;
      } else {
        throw error;
      }
    }
    await loadData();
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Authy",
      message: "Data has been synced",
    });
  }

  async function loadData(): Promise<void> {
    try {
      if (!props.isLogin) {
        return;
      }
      const servicesResponse: Services = await getFromCache(SERVICES_KEY);
      const appsResponse: AuthyApp = await getFromCache(APPS_KEY);
      const {
        authyPassword,
        excludeNames: excludeNamesCsv = "",
        recentlyUsedOrder,
      } = getPreferenceValues<{ authyPassword: string; excludeNames: string; recentlyUsedOrder: boolean }>();
      const services: Otp[] = servicesResponse.authenticator_tokens.map((i) => {
        const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword);

        return {
          id: i.unique_id,
          type: "service",
          name: preferCustomName ? i.name || i.original_name : i.original_name || i.name,
          accountType: i.account_type,
          issuer: i.issuer,
          logo: i.logo,
          digits: i.digits,
          generate: () => seed ? generateTOTP(seed, { digits: i.digits, period: 30 }) : CORRUPTED,
        };
      });
      const apps: Otp[] = appsResponse.apps.map((i) => {
        return {
          id: i._id,
          type: "app",
          name: i.name,
          digits: i.digits,
          generate: () => generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), { digits: i.digits, period: 10 }),
        };
      });

      let allItems = [...apps, ...services];

      if (excludeNamesCsv) {
        const excludeNames = excludeNamesCsv.split(",").map(toId).filter(Boolean);
        const filterByName = ({ name }: { name: string }) => !excludeNames.includes(toId(name));
        allItems = allItems.filter(filterByName);
      }

      allItems = allItems.sort((a, b) => compareByName(a.name, b.name));
      if (recentlyUsedOrder && (await checkIfCached(RECENTLY_USED))) {
        const recentlyUsed = new Map<string, number>(await getFromCache(RECENTLY_USED));
        allItems = allItems.sort((a, b) => compareByDate(recentlyUsed.get(a.id) ?? 0, recentlyUsed.get(b.id) ?? 0));
      }

      setOtpList(allItems);
    } catch (error) {
      if (error instanceof Error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Authy",
          message: error.message,
        });
      } else {
        throw error;
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [props.isLogin]);

  const isLoading = otpList.length === 0;

  return (
    <List searchBarPlaceholder="Search" isLoading={isLoading}>
      <OtpListItems refresh={refresh} items={otpList} setOtpList={setOtpList} />
    </List>
  );
}
