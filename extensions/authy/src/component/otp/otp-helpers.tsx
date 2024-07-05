import {
  Action,
  confirmAlert,
  getPreferenceValues,
  Icon,
  open,
  openCommandPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import {
  addToCache,
  checkIfCached,
  DEVICE_ID,
  getFromCache,
  OPT_SERVICES_KEY,
  RECENTLY_USED,
  SECRET_SEED,
} from "../../cache";
import { getOtpServices, logout, Service } from "../login/login-helper";
import { compareByDate, compareByName, toId } from "../../util/compare";
import Export from "../export/Export";

const {
  excludeNames: excludeNamesCsv = "",
  primaryActionIsCopy,
  recentlyUsedOrder,
} = getPreferenceValues<{
  excludeNames: string;
  primaryActionIsCopy: boolean;
  recentlyUsedOrder: boolean;
}>();

/**
 * Placeholder for Services with broken seeds
 */
export const CORRUPTED = "corrupted";

/**
 * Just a type to use in other files
 */
export type setItemsFunction = (
  value:
    | ((prevState: { otpList: Service[]; isLoading: boolean }) => { otpList: Service[]; isLoading: boolean })
    | { otpList: Service[]; isLoading: boolean }
) => void;

/**
 * Loads OTP services to show, sort and exclude values from extension properties
 */
export async function loadData(setItems: setItemsFunction): Promise<void> {
  const otpServices = await sortServices(await getFromCache(OPT_SERVICES_KEY));

  setItems({
    otpList: otpServices,
    isLoading: false,
  });
}

/**
 *
 */
export async function checkError(otpList: Service[]) {
  if (otpList.length === 0) return;

  // filter out all the corrupted otp
  const all = otpList.filter((otp) => otp.type == "service" && otp.seed != null);
  // if none of the otp are valid assume there is a problem with the password
  if (all.length === 0) {
    confirmAlert({
      title: "No valid OTP",
      message: "Check your Authy Backup Password in settings",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openCommandPreferences(),
      },
      dismissAction: {
        title: "Cancel",
        onAction: () =>
          confirmAlert({
            title: "No valid OTP",
            message: "Check Q&A in store",
            primaryAction: {
              title: "Open Store Page",
              onAction: () => open("https://www.raycast.com/guga4ka/authy"),
            },
          }),
      },
    });
  }
}

/**
 * Function to update a list of services
 */
export async function refresh(setItems: setItemsFunction) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Twilio’s Authy",
    message: "Refreshing",
  });
  await toast.show();
  setItems((prevState) => {
    return {
      otpList: prevState.otpList,
      isLoading: true,
    };
  });
  let services: Service[] = [];
  try {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const deviceId: number = await getFromCache(DEVICE_ID);
    const secretSeed: string = await getFromCache(SECRET_SEED);
    services = await getOtpServices(deviceId, secretSeed, toast);
  } catch (error) {
    if (error instanceof Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Twilio’s Authy",
        message: error.message,
      });
      return;
    } else {
      throw error;
    }
  }
  services = await sortServices(services);
  setItems({
    otpList: services,
    isLoading: false,
  });
  await toast.hide();
  await showToast({
    style: Toast.Style.Success,
    title: "Twilio’s Authy",
    message: "Data has been synced",
  });
}

/**
 * Refresh and Logout Actions
 */
export function commonActions(refresh: () => Promise<void>) {
  return (
    <>
      <Action
        title={"Sync"}
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={refresh}
      />
      <Action.Push
        title={"Export Tokens"}
        icon={Icon.Download}
        target={<Export />}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
      />
      <Action
        title={"Logout"}
        icon={Icon.Logout}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        style={Action.Style.Destructive}
        onAction={async () => {
          await logout();
          await popToRoot();
        }}
      />
    </>
  );
}

/**
 * Copy/Paste action in order of extension preferences
 * In case if otp corrupted returns submit issue action
 */
export function otpActions(otp: string, id: string, index: number, setItems: setItemsFunction) {
  if (otp == CORRUPTED) {
    return <Action.OpenInBrowser title="Submit Issue" url="https://github.com/raycast/extensions/issues/new/choose" />;
  }

  const copy = (
    <Action.CopyToClipboard
      title="Copy OTP"
      content={otp}
      onCopy={async () => await updateOrderIfEnabled(id, index, setItems)}
    />
  );

  const paste = (
    <Action.Paste
      title="Output OTP"
      content={otp}
      onPaste={async () => await updateOrderIfEnabled(id, index, setItems)}
    />
  );

  return (
    <>
      {primaryActionIsCopy ? copy : paste}
      {primaryActionIsCopy ? paste : copy}
    </>
  );
}

async function updateOrderIfEnabled(id: string, index: number, setOtpList: setItemsFunction) {
  if (recentlyUsedOrder) {
    // add usage to cache
    const recentlyUsed = (await checkIfCached(RECENTLY_USED))
      ? new Map<string, number>(await getFromCache(RECENTLY_USED))
      : new Map<string, number>();
    recentlyUsed.set(id, Date.now());
    await addToCache(RECENTLY_USED, Array.from(recentlyUsed.entries()));
    // update current list for users that don't use short timer for pop to root options
    setOtpList((prev) => {
      prev.otpList.unshift(prev.otpList.splice(index, 1)[0]);
      return prev;
    });
  }
}

async function sortServices(otpServices: Service[]) {
  if (excludeNamesCsv) {
    const excludeNames = excludeNamesCsv.split(",").map(toId).filter(Boolean);
    const filterByName = ({ name }: { name: string }) => !excludeNames.includes(toId(name));
    otpServices = otpServices.filter(filterByName);
  }

  otpServices = otpServices.sort((a, b) => compareByName(a.name, b.name));
  if (recentlyUsedOrder && (await checkIfCached(RECENTLY_USED))) {
    const recentlyUsed = new Map<string, number>(await getFromCache(RECENTLY_USED));
    otpServices = otpServices.sort((a, b) => compareByDate(recentlyUsed.get(a.id) ?? 0, recentlyUsed.get(b.id) ?? 0));
  }
  return otpServices;
}
