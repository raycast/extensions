import { getPreferenceValues, List, popToRoot, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { addToCache, APPS_KEY, DEVICE_ID, getFromCache, SECRET_SEED, SERVICES_KEY } from "../cache";
import { AuthyApp, Services } from "../client/dto";
import { decryptSeed, genTOTP } from "../util/utils";
import { encode } from "hi-base32";
import { generateTOTP } from "../util/totp";
import { toId } from "../util/compare";
import { getAuthyApps, getServices } from "../client/authy-client";
import { Otp } from "./OtpListItem";
import OtpListItems from "./OtpListItems";

const { preferCustomName } = getPreferenceValues<{ preferCustomName: boolean }>();

interface OtpListState {
  apps: Otp[];
  services: Otp[];
}

export function OtpList(props: { isLogin: boolean | undefined; setLogin: (login: boolean) => void }) {
  const [{ apps, services }, setState] = useState<OtpListState>({
    apps: [],
    services: [],
  });

  async function refresh(): Promise<void> {
    const toast = await showToast(ToastStyle.Animated, "Authy", "Refreshing");
    await toast.show();
    setState({ apps: [], services: [] });
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
        await showToast(ToastStyle.Failure, "Authy", error.message);
        await popToRoot();
      } else {
        throw error;
      }
    }
    await loadData();
    await toast.hide();
    await showToast(ToastStyle.Success, "Authy", "Data was successful refreshed");
  }

  async function loadData(): Promise<void> {
    try {
      if (!props.isLogin) {
        return;
      }
      const servicesResponse: Services = await getFromCache(SERVICES_KEY);
      const appsResponse: AuthyApp = await getFromCache(APPS_KEY);
      const { authyPassword, excludeNames: excludeNamesCsv = "" } =
        getPreferenceValues<{ authyPassword: string; excludeNames: string }>();
      let services: Otp[] = servicesResponse.authenticator_tokens.map((i) => {
        const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword);
        return {
          type: "service",
          name: preferCustomName ? i.name || i.original_name : i.original_name || i.name,
          accountType: i.account_type,
          issuer: i.issuer,
          logo: i.logo,
          digits: i.digits,
          generate: () => generateTOTP(seed, { digits: i.digits, period: 30 }),
        };
      });
      let apps: Otp[] = appsResponse.apps.map((i) => {
        return {
          type: "app",
          name: i.name,
          digits: i.digits,
          generate: () => generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), { digits: i.digits, period: 10 }),
        };
      });

      if (excludeNamesCsv) {
        const excludeNames = excludeNamesCsv.split(",").map(toId).filter(Boolean);
        const filterByName = ({ name }: { name: string }) => !excludeNames.includes(toId(name));
        services = services.filter(filterByName);
        apps = apps.filter(filterByName);
      }
      setState({
        apps,
        services,
      });
    } catch (error) {
      if (error instanceof Error) {
        await showToast(ToastStyle.Failure, "Authy", error.message);
      } else {
        throw error;
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [props.isLogin]);

  const allItems = [...apps, ...services];
  const isLoading = allItems.length === 0;

  return (
    <List searchBarPlaceholder="Search" isLoading={isLoading}>
      <OtpListItems refresh={refresh} items={allItems} />
    </List>
  );
}
