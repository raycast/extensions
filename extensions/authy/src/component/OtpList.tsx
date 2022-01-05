import {
  ActionPanel,
  CopyToClipboardAction,
  environment,
  getPreferenceValues,
  Icon,
  List,
  popToRoot,
  preferences,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { addToCache, APPS_KEY, DEVICE_ID, getFromCache, SECRET_SEED, SERVICES_KEY } from "../cache";
import { AuthyApp, Services } from "../client/dto";
import { decryptSeed, genTOTP } from "../util/utils";
import { encode } from "hi-base32";
import { generateTOTP } from "../util/totp";
import { getAuthyApps, getServices } from "../client/authy-client";
import { OutputToCurrentApp } from "./OutputToCurrentApp";
import { icon } from "../util/icon";
import { icondir } from "../constants";

export const preferCustomName = Boolean(
  preferences["preferCustomName"].value !== undefined
    ? preferences["preferCustomName"].value
    : preferences["preferCustomName"].default
);
export const primaryActionIsCopy = Boolean(
  preferences["primaryActionIsCopy"].value !== undefined
    ? preferences["primaryActionIsCopy"].value
    : preferences["primaryActionIsCopy"].default
);

export interface Otp {
  name: string;
  digits: number;
  seed: string;
  period: number;
  generate: () => string;
  otp?: string;
  issuer?: string;
  logo?: string;
  accountType?: string;
}

function PrimaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <CopyToClipboardAction title="Copy OTP" content={pin} />
  ) : (
    <OutputToCurrentApp title="Output OTP" pin={pin} />
  );
}

function SecondaryAction({ pin }: { pin: string }) {
  return primaryActionIsCopy ? (
    <OutputToCurrentApp title="Output OTP" pin={pin} />
  ) : (
    <CopyToClipboardAction title="Copy OTP" content={pin} />
  );
}

function calculateTimeLeft(basis: number) {
  return basis - (new Date().getSeconds() % basis);
}

interface OtpListState {
  state: Otp[];
  timeLeft10: number;
  timeLeft30: number;
}

export function OtpList(props: { isLogin: boolean | undefined; setLogin: (login: boolean) => void }) {
  const [{ state, timeLeft10, timeLeft30 }, setState] = useState<OtpListState>({
    state: [],
    timeLeft10: calculateTimeLeft(10),
    timeLeft30: calculateTimeLeft(30),
  });

  async function refresh(): Promise<void> {
    const toast = await showToast(ToastStyle.Animated, "Authy", "Refreshing");
    await toast.show();
    setState({ state: [], timeLeft10: calculateTimeLeft(10), timeLeft30: calculateTimeLeft(30) });
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
          seed: seed,
          generate: () => generateTOTP(seed, { digits: i.digits, period: 30 }),
          period: 30,
        };
      });
      const apps: Otp[] = appsResponse.apps.map((i) => {
        return {
          name: i.name,
          digits: i.digits,
          seed: i.secret_seed,
          generate: () => generateTOTP(encode(Buffer.from(i.secret_seed, "hex")), { digits: i.digits, period: 10 }),
          period: 10,
        };
      });
      const updateOtp = () =>
        setState({
          timeLeft10: calculateTimeLeft(10),
          timeLeft30: calculateTimeLeft(30),
          state: [...services, ...apps].map((item) => ({
            ...item,
            otp: item.generate(),
          })),
        });
      setInterval(
        () =>
          calculateTimeLeft(10) === 10 && new Date().getMilliseconds() < 250
            ? updateOtp()
            : setState((current) => ({
                ...current,
                timeLeft10: calculateTimeLeft(10),
                timeLeft30: calculateTimeLeft(30),
              })),
        250
      );
      updateOtp();
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

  const isLoading = state.length == 0;

  return (
    <List searchBarPlaceholder="Search" isLoading={isLoading}>
      {state.map((item, index) => (
        <List.Item
          key={index}
          title={item.name}
          accessoryTitle={`${item.otp}`}
          subtitle={`${item.issuer || item.accountType}`}
          accessoryIcon={
            item.period === 30
              ? {
                  source: {
                    light: `${environment.assetsPath}/${icondir}/light/pie-${timeLeft30}.png`,
                    dark: `${environment.assetsPath}/${icondir}/dark/pie-${timeLeft30}.png`,
                  },
                }
              : {
                  source: {
                    light: `${environment.assetsPath}/${icondir}/light/pie-${timeLeft10 * 3}.png`,
                    dark: `${environment.assetsPath}/${icondir}/dark/pie-${timeLeft10 * 3}.png`,
                  },
                }
          }
          icon={icon(item)}
          actions={
            <ActionPanel>
              <PrimaryAction pin={item.otp ?? ""} />
              <SecondaryAction pin={item.otp ?? ""} />
              <ActionPanel.Item
                title={"Sync"}
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={() => refresh()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
