import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  showToast,
  ToastStyle
} from "@raycast/api";
import { useEffect, useState } from "react";
import { addToCache, APPS_KEY, DEVICE_ID, getFromCache, SECRET_SEED, SERVICES_KEY } from "../cache";
import { AuthyApp, Services } from "../client/dto";
import { decryptSeed, genTOTP } from "../util/utils";
import { encode } from "hi-base32";
import { generateTOTP } from "../util/totp";
import { getAuthyApps, getServices } from "../client/authy-client";

interface Otp {
  name: string,
  digits: number,
  seed: string,
  otp: string
}

export function OtpList(props: { isLogin: boolean | undefined, setLogin: (login: boolean) => void }) {
  const [state, setState] = useState<Otp[]>([]);

  async function refresh(): Promise<void> {
    const toast = await showToast(ToastStyle.Animated, "Authy", "Refreshing");
    await toast.show();
    setState([]);
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
      const services: Otp[] = servicesResponse.authenticator_tokens.map(i => {
        const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword);
        return {
          name: i.original_name ? i.original_name : i.name,
          digits: i.digits,
          seed: seed,
          otp: generateTOTP(seed, { digits: i.digits, period: 30 })
        };
      });
      const apps: Otp[] = appsResponse.apps.map(i => {
        return {
          name: i.name,
          digits: i.digits,
          seed: i.secret_seed,
          otp: generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), { digits: i.digits, period: 10 })
        };
      });
      setState([...services, ...apps]);
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

  const isLoading = (state.length == 0);

  return (
    <List searchBarPlaceholder="Search"
          isLoading={isLoading}>
      {
        state.map((item, index) =>
          <List.Item key={index} title={item.name} subtitle={`${item.otp}`} actions={
            <ActionPanel>
              <CopyToClipboardAction title="Copy OTP" content={item.otp} />
              <ActionPanel.Item title={"Sync"} icon={Icon.ArrowClockwise}
                                shortcut={{ modifiers: ["cmd"], key: "r" }}
                                onAction={() => refresh()} />
            </ActionPanel>
          } />)
      }
    </List>
  );
}