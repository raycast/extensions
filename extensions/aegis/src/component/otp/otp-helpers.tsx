import {
  Action,
  confirmAlert,
  getPreferenceValues,
  open,
  openCommandPreferences,
} from "@raycast/api";
import {
  addToCache,
  checkIfCached,
  getFromCache,
  RECENTLY_USED,
} from "../../cache";
import { Service } from "../../util/service";
import { compareByDate, compareByName, toId } from "../../util/compare";
import { AegisDB } from "../../util/AegisDB";

const {
  excludeNames: excludeNamesCsv = "",
  primaryActionIsCopy,
  recentlyUsedOrder,
  aegisDbPath,
  aegisPassword,
} = getPreferenceValues<{
  excludeNames: string;
  primaryActionIsCopy: boolean;
  recentlyUsedOrder: boolean;
  aegisDbPath: string;
  aegisPassword: string;
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
    | ((prevState: { otpList: Service[]; isLoading: boolean }) => {
        otpList: Service[];
        isLoading: boolean;
      })
    | { otpList: Service[]; isLoading: boolean }
) => void;

/**
 * Loads OTP services to show, sort and exclude values from extension propertiesz
 */
export async function loadData(setItems: setItemsFunction): Promise<void> {
  try {
    // load Aegis
    const aegisDB = new AegisDB(aegisDbPath);
    //Load the database
    await aegisDB.loadDb();

    //Decrypt the database
    const db_entries = await aegisDB.decryptDb(aegisPassword);
    const otpServices: Service[] = db_entries.map((i) => {
      return {
        id: i.uuid,
        name: i.name,
        digits: i.info.digits,
        period: i.info.period,
        seed: i.info.secret,
        accountType: "service",
        issuer: i.issuer,
        // logo: i.logo,
        logo: i.icon,
        logo_mime: i.icon_mime,
        type: "service",
      };
    });

    setItems({
      otpList: await sortServices(otpServices),
      isLoading: false,
    });
  } catch (error) {
    setItems({
      otpList: [],
      isLoading: false,
    });
  }
}

/**
 *
 */
export async function checkError(otpList: Service[], isLoading: boolean) {
  // if (otpList.length === 0) return;
  if (isLoading) return;

  // filter out all the corrupted otp
  const all = otpList.filter(
    (otp) => otp.type == "service" && otp.seed != null
  );
  // if none of the otp are valid assume there is a problem with the password
  if (all.length === 0) {
    confirmAlert({
      title: "No valid OTP",
      message: "Check your Aegis Encryption Password in settings",
      primaryAction: {
        title: "Open Preferences",
        onAction: () => openCommandPreferences(),
      },
    });
  }
}

/**
 * Copy/Paste action in order of extension preferences
 * In case if otp corrupted returns submit issue action
 */
export function otpActions(
  otp: string,
  id: string,
  index: number,
  setItems: setItemsFunction
) {
  if (otp == CORRUPTED) {
    return (
      <Action.OpenInBrowser
        title="Submit Issue"
        url="https://github.com/raycast/extensions/issues/new/choose"
      />
    );
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

async function updateOrderIfEnabled(
  id: string,
  index: number,
  setOtpList: setItemsFunction
) {
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
    const filterByName = ({ name }: { name: string }) =>
      !excludeNames.includes(toId(name));
    otpServices = otpServices.filter(filterByName);
  }

  otpServices = otpServices.sort((a, b) => compareByName(a.name, b.name));
  if (recentlyUsedOrder && (await checkIfCached(RECENTLY_USED))) {
    const recentlyUsed = new Map<string, number>(
      await getFromCache(RECENTLY_USED)
    );
    otpServices = otpServices.sort((a, b) =>
      compareByDate(recentlyUsed.get(a.id) ?? 0, recentlyUsed.get(b.id) ?? 0)
    );
  }
  return otpServices;
}
