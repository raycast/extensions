import {
  Action,
  getPreferenceValues
} from "@raycast/api";
import * as fs from "fs/promises";
import {
  addToCache,
  checkIfCached,
  getFromCache,
  RECENTLY_USED
} from "../../cache";
import { compareByDate, compareByName, toId } from "../../util/compare";
import { Service } from "../../util/service";

const {
  excludeNames: excludeNamesCsv = "",
  primaryActionIsCopy,
  recentlyUsedOrder,
  enteAuthDbPath,
} = getPreferenceValues<{
  excludeNames: string;
  primaryActionIsCopy: boolean;
  recentlyUsedOrder: boolean;
  enteAuthDbPath: string;
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

interface TOTPParams {
  secret: string;
  algorithm: Algorithm;
  digits: number;
  period: number;
}

type Algorithm = 'sha1' | 'sha256' | 'sha512';

export function parseOTPURI(uri: string): TOTPParams {
  const url = new URL(uri);
  const secret = url.searchParams.get('secret');
  const algorithmStr = url.searchParams.get('algorithm')?.toLowerCase() || 'sha1';
  const digits = parseInt(url.searchParams.get('digits') || '6', 10);
  const period = parseInt(url.searchParams.get('period') || '30', 10);

  if (!secret) {
    throw new Error('Secret is missing from the URI');
  }

  let algorithm: Algorithm;
  switch (algorithmStr) {
    case 'sha1':
    case 'sha256':
    case 'sha512':
      algorithm = algorithmStr;
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithmStr}`);
  }

  return { secret, algorithm, digits, period };
}

export function extractOtpIssuer(url: string): string {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'otpauth:' || parsedUrl.hostname !== 'totp') {
    return 'Invalid OTP URL format';
  }

  const issuer = parsedUrl.searchParams.get('issuer');

  if (!issuer) {
    return 'Issuer not found in the URL';
  }

  return issuer;
}

/**
 * Loads OTP services to show, sort and exclude values from extension properties
 */
export async function loadData(setItems: setItemsFunction): Promise<void> {
  try {
    const fileContent = await fs.readFile(enteAuthDbPath, "utf8");
    const services = fileContent.trim().split("\n");

    const otpServices: Service[] = services.map((s) => {
      const name = extractOtpIssuer(s);
      const otp = parseOTPURI(s);

      return {
        name: name,
        digits: otp.digits,
        period: otp.period,
        seed: otp.secret,
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
