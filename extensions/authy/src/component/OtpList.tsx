import { getPreferenceValues, List, popToRoot, showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { addToCache, APPS_KEY, DEVICE_ID, getFromCache, SECRET_SEED, SERVICES_KEY } from "../cache";
import { AuthyApp, Services } from "../client/dto";
import { decryptSeed, genTOTP } from "../util/utils";
import { encode } from "hi-base32";
import { generateTOTP } from "../util/totp";
import { getAuthyApps, getServices } from "../client/authy-client";
import OtpListItem from "./OtpListItem";

const { preferCustomName } = getPreferenceValues<{ preferCustomName: boolean }>();

export interface Otp {
  name: string;
  digits: number;
  generate: () => string;
  issuer?: string;
  logo?: string;
  accountType?: string;
}

function calculateTimeLeft(basis: number) {
  return basis - (new Date().getSeconds() % basis);
}

interface OtpListState {
  apps: Otp[];
  services: Otp[];
}

interface TimeState {
  timeLeft10: number;
  timeLeft30: number;
}

export function OtpList(props: { isLogin: boolean | undefined; setLogin: (login: boolean) => void }) {
  const [{ apps, services }, setState] = useState<OtpListState>({
    apps: [],
    services: [],
  });
  const [{ timeLeft10, timeLeft30 }, setTimes] = useState<TimeState>({
    timeLeft10: calculateTimeLeft(10),
    timeLeft30: calculateTimeLeft(30),
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
      const { authyPassword } = getPreferenceValues<{ authyPassword: string }>();
      const services: Otp[] = servicesResponse.authenticator_tokens.map((i) => {
        const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword);
        return {
          name: preferCustomName ? i.name || i.original_name : i.original_name || i.name,
          accountType: i.account_type,
          issuer: i.issuer,
          logo: i.logo,
          digits: i.digits,
          generate: () => generateTOTP(seed, { digits: i.digits, period: 30 }),
        };
      });
      const apps: Otp[] = appsResponse.apps.map((i) => {
        return {
          name: i.name,
          digits: i.digits,
          generate: () => generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), { digits: i.digits, period: 10 }),
        };
      });
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

  useEffect(() => {
    // use 250ms to get closer to the start of the second
    // and only update when we are close to the start of the second
    const id = setInterval(
      () =>
        new Date().getMilliseconds() < 250 &&
        setTimes({
          timeLeft10: calculateTimeLeft(10),
          timeLeft30: calculateTimeLeft(30),
        }),
      250
    );
    return () => clearInterval(id);
  }, []);

  const isLoading = [...apps, ...services].length == 0;

  return (
    <List searchBarPlaceholder="Search" isLoading={isLoading}>
      <List.Section title="Apps">
        {apps.map((item, index) => (
          <OtpListItem key={index} item={item} basis={10} timeLeft={timeLeft10} refresh={refresh} />
        ))}
      </List.Section>
      <List.Section title="Services">
        {services.map((item, index) => (
          <OtpListItem key={index} item={item} basis={30} timeLeft={timeLeft30} refresh={refresh} />
        ))}
      </List.Section>
    </List>
  );
}
