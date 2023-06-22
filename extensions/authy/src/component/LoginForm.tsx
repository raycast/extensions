import { useEffect } from "react";
import {
  checkRequestStatus,
  completeRegistration,
  getAuthyApps,
  getServices,
  requestRegistration,
} from "../client/authy-client";
import { ActionPanel, Detail, environment, getPreferenceValues, Icon, showToast, Action, Toast } from "@raycast/api";
import {
  addToCache,
  APPS_KEY,
  AUTHY_ID,
  checkIfCached,
  DEVICE_ID,
  getFromCache,
  removeFromCache,
  REQUEST_ID,
  SECRET_SEED,
  SERVICES_KEY,
} from "../cache";
import { genTOTP } from "../util/utils";

const message = `
## Approval request has been sent
To continue approve request at any other device and press ⏎ to continue.

![approve](file://${environment.assetsPath}/approve.png)

Or press ⌘ + ⏎ to start this process from scratch 
`;

async function requestLoginIfNeeded() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Authy",
    message: "Waiting for Approval",
  });
  try {
    const requestExists = await checkIfCached(REQUEST_ID);
    if (!requestExists) {
      const { authyId } = getPreferenceValues<{ authyId: number }>();
      const registration = await requestRegistration(authyId);
      await addToCache(REQUEST_ID, registration.request_id);
    }
  } catch (error) {
    if (error instanceof Error) {
      await toast.hide();
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

async function checkForApproval(setLogin: (step: boolean) => void) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking request status",
  });
  try {
    const { authyId } = getPreferenceValues<{ authyId: number }>();
    if (!(await checkIfCached(DEVICE_ID)) || !(await checkIfCached(SECRET_SEED))) {
      const requestId: string = await getFromCache(REQUEST_ID);
      const registrationStatus = await checkRequestStatus(authyId, requestId);

      if (registrationStatus.status == "rejected") {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Authy",
          message: "Seems like you rejected registration request",
        });
        await removeFromCache(REQUEST_ID);
      }

      if (registrationStatus.status == "pending") {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Authy",
          message: "Seems like you didn't approve registration request",
        });
        return Promise.resolve();
      }
      const device = await completeRegistration(authyId, registrationStatus.pin);
      await addToCache(DEVICE_ID, device.device.id);
      await addToCache(SECRET_SEED, device.device.secret_seed);
    }
    const deviceId: number = await getFromCache(DEVICE_ID);
    const secretSeed: string = await getFromCache(SECRET_SEED);
    // get authy apps
    const authyApp = await getAuthyApps(authyId, deviceId, genTOTP(secretSeed));
    await addToCache(APPS_KEY, authyApp);
    // get 3rd party services
    const services = await getServices(authyId, deviceId, genTOTP(secretSeed));
    await addToCache(SERVICES_KEY, services);
    await addToCache(AUTHY_ID, authyId);
    setLogin(true);
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Authy",
      message: "Success Login",
    });
    return Promise.resolve();
  } catch (error) {
    if (error instanceof Error) {
      await removeFromCache(REQUEST_ID);
      await toast.hide();
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

async function resetRegistration() {
  await removeFromCache(REQUEST_ID);
  await removeFromCache(DEVICE_ID);
  await removeFromCache(SECRET_SEED);
  await requestLoginIfNeeded();
}

export default function LoginForm(props: { setLogin: (step: boolean) => void }) {
  useEffect(() => {
    (async () => {
      await requestLoginIfNeeded();
    })();
  });

  return (
    <Detail
      markdown={`${message}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Checkmark}
            title="Agree"
            onSubmit={() => checkForApproval(props.setLogin)}
            shortcut={{ key: "enter", modifiers: [] }}
          />
          <Action
            icon={Icon.ExclamationMark}
            title={"Start From Scratch"}
            onAction={resetRegistration}
            shortcut={{ key: "enter", modifiers: ["cmd"] }}
          />
        </ActionPanel>
      }
    />
  );
}
