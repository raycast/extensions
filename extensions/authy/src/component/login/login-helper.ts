import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  addToCache,
  APPS_KEY,
  AUTHY_ID,
  checkIfCached,
  DEVICE_ID,
  getFromCache,
  OPT_SERVICES_KEY,
  removeFromCache,
  REQUEST_ID,
  SECRET_SEED,
  SERVICES_KEY,
} from "../../cache";
import {
  checkRequestStatus,
  completeRegistration,
  getAuthyApps,
  getServices,
  requestRegistration,
} from "../../client/authy-client";
import { generateTOTP } from "../../util/totp";
import { encode } from "hi-base32";
import { mapOtpServices } from "../../util/utils";

export const WELCOME_MESSAGE = `
## Approval request has been sent
To continue, approve request at any other device and press ⏎ to continue.

<img src="file://${environment.assetsPath}/approve.png" height="200"  alt=""/>

Or press ⌘ + ⏎ to start this process from scratch 
`;

export interface Service {
  id: string;
  name: string;
  digits: number;
  period: number;
  seed: string | null;
  accountType?: string;
  issuer?: string;
  logo?: string;
  type: "authy" | "service";
}

const { authyId } = getPreferenceValues<{ authyId: number }>();

export async function requestLoginIfNeeded() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Twilio’s Authy",
    message: "Waiting for Approval",
  });
  try {
    const requestExists = await checkIfCached(REQUEST_ID);
    if (!requestExists) {
      const registration = await requestRegistration(authyId);
      await addToCache(REQUEST_ID, registration.request_id);
    }
  } catch (error) {
    if (error instanceof Error) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Twilio’s Authy",
        message: error.message,
      });
    } else {
      throw error;
    }
  }
}

export async function login(setLogin: (step: boolean) => void) {
  const loginToast = new Toast({
    title: "Twilio’s Authy",
  });

  try {
    // check if login request exist
    if (!(await checkIfCached(REQUEST_ID))) {
      loginToast.message = "Login Request not found";
      loginToast.style = Toast.Style.Failure;
      await loginToast.show();
      return;
    }

    const requestId: string = await getFromCache(REQUEST_ID);
    const device = await checkForApproval(requestId, loginToast);

    if (device == undefined) {
      return;
    }

    await getOtpServices(device.device.id, device.device.secret_seed, loginToast);
    await addToCache(AUTHY_ID, authyId);

    await loginToast.hide();

    loginToast.style = Toast.Style.Success;
    loginToast.message = "Success Login";
    await loginToast.show();

    setLogin(true);
    await loginToast.hide();
  } catch (error) {
    if (error instanceof Error) {
      await loginToast.hide();
      loginToast.message = `Something went wrong. Try again.\n${error.message}`;
      loginToast.style = Toast.Style.Failure;
      await loginToast.show();
    } else {
      throw error;
    }
  }
}

export async function resetRegistration() {
  await removeFromCache(REQUEST_ID);
  await removeFromCache(DEVICE_ID);
  await removeFromCache(SECRET_SEED);
  await requestLoginIfNeeded();
}

async function checkForApproval(requestId: string, toast: Toast) {
  toast.message = "Checking request status";
  toast.style = Toast.Style.Animated;
  await toast.show();

  const registrationStatus = await checkRequestStatus(authyId, requestId);

  if (registrationStatus.status == "rejected") {
    await toast.hide();

    toast.message = "Seems like you rejected registration request";
    toast.style = Toast.Style.Failure;
    await toast.show();

    await removeFromCache(REQUEST_ID);
    return;
  }

  if (registrationStatus.status == "pending") {
    await toast.hide();

    toast.message = "Seems like you didn't approve registration request";
    toast.style = Toast.Style.Failure;
    await toast.show();

    return;
  }

  const device = await completeRegistration(authyId, registrationStatus.pin);
  await addToCache(DEVICE_ID, device.device.id);
  await addToCache(SECRET_SEED, device.device.secret_seed);
  await toast.hide();
  return device;
}

export async function getOtpServices(deviceId: number, secretSeed: string, toast: Toast) {
  toast.message = "Getting Services";
  toast.style = Toast.Style.Animated;
  await toast.show();

  const seed = encode(Buffer.from(secretSeed, "hex"));
  const timestamp = new Date();
  const otps = [
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 1000 }),
    generateTOTP(seed, { digits: 7, period: 10, timestamp: timestamp.getTime() + 10 * 2 * 1000 }),
  ];

  // get authy apps
  const authyAppResponse = await getAuthyApps(authyId, deviceId, otps);
  // get 3rd party services
  const authyServicesResponse = await getServices(authyId, deviceId, otps);
  // map opt Services to common format
  const optServices = mapOtpServices(authyServicesResponse.authenticator_tokens, authyAppResponse.apps);

  await addToCache(SERVICES_KEY, authyServicesResponse);
  await addToCache(APPS_KEY, authyAppResponse);
  await addToCache(OPT_SERVICES_KEY, optServices);

  return optServices;
}

export async function logout() {
  await removeFromCache(SECRET_SEED);
  await removeFromCache(DEVICE_ID);
  await removeFromCache(SERVICES_KEY);
  await removeFromCache(APPS_KEY);
  await removeFromCache(REQUEST_ID);
  await removeFromCache(OPT_SERVICES_KEY);
}
